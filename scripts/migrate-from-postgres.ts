/**
 * One-off: copy all app data from the OLD Postgres database into D1.
 *
 * Usage:
 *   OLD_DATABASE_URL=postgres://… pnpm db:migrate-from-postgres            # → local D1
 *   pnpm db:migrate-from-postgres postgres://… --env staging               # → REMOTE staging D1
 *   pnpm db:migrate-from-postgres postgres://… --remote                    # → REMOTE production D1
 *   … --persist-to <dir>                                                   # → local D1 in <dir>
 *   … --force                                                              # wipe target tables first
 *
 * The target D1 must already have the schema (pnpm db:migrate:local / :staging / :production).
 *
 * Copies users, members, distilleries, gatherings, whiskies, tastings, tasting_notes (FK order).
 * Conversions: timestamps → Date (Postgres `timestamp` without time zone is read as UTC, exactly as
 * Drizzle's pg-core did), users.email_verified timestamp → boolean (not null → true), numeric abv →
 * decimal string, jsonb → objects (re-serialised by Drizzle's json mode).
 *
 * No auth tables are copied: the old NextAuth setup used JWT sessions and stored no
 * accounts/sessions; Better Auth links a Google sign-in to the existing user by email.
 *
 * Refuses to run if any target table already has rows, unless --force (which deletes target rows
 * in reverse FK order first). Fails if read and written row counts differ for any table.
 */
import postgres from "postgres";
import { count, getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "@/db/schema";
import { getD1, insertChunked, parseTargetArgs, type Db } from "./lib/d1";

// FK order: every table only references tables earlier in this list.
const TABLES: Array<{ name: string; table: SQLiteTable }> = [
  { name: "users", table: schema.users },
  { name: "members", table: schema.members },
  { name: "distilleries", table: schema.distilleries },
  { name: "gatherings", table: schema.gatherings },
  { name: "whiskies", table: schema.whiskies },
  { name: "tastings", table: schema.tastings },
  { name: "tasting_notes", table: schema.tastingNotes },
];
// Better Auth tables that reference users: checked for emptiness / cleared on --force.
const AUTH_TABLES: Array<{ name: string; table: SQLiteTable }> = [
  { name: "sessions", table: schema.sessions },
  { name: "accounts", table: schema.accounts },
];

type Args = { url: string; force: boolean };

function parseArgs(argv: string[]): Args {
  let url = process.env.OLD_DATABASE_URL ?? "";
  let force = false;
  for (const a of argv.slice(2)) {
    if (a === "--force") force = true;
    else if (/^postgres(ql)?:\/\//.test(a)) url = a;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!url) throw new Error("Give the old database URL as OLD_DATABASE_URL or as an argument");
  return { url, force };
}

const PG_TIMESTAMP = 1114; // timestamp without time zone
const PG_TIMESTAMPTZ = 1184;

function toDate(v: unknown, where: string): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    // Raw text from Postgres: "2020-01-17 00:00:00[.123][+00]". No offset → UTC (as Drizzle did).
    const iso = v.replace(" ", "T");
    const d = new Date(/[zZ]|[+-]\d\d(:?\d\d)?$/.test(iso) ? iso : `${iso}Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error(`Cannot convert ${JSON.stringify(v)} to a date (${where})`);
}

/** Map one Postgres row (snake_case) to an insert object for the D1 table (camelCase keys). */
function convertRow(tableName: string, table: SQLiteTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (!(col.name in row)) continue; // column new in D1 schema: let its default apply
    const v = row[col.name];
    const where = `${tableName}.${col.name}`;
    if (v === null || v === undefined) {
      // users.email_verified was a nullable timestamp; it is now NOT NULL boolean.
      out[key] = col.columnType === "SQLiteBoolean" ? false : null;
      continue;
    }
    switch (col.columnType) {
      case "SQLiteTimestamp":
        out[key] = toDate(v, where);
        break;
      case "SQLiteBoolean":
        // Real booleans pass through; a non-null timestamp (email_verified) means true.
        out[key] = typeof v === "boolean" ? v : true;
        break;
      case "SQLiteTextJson":
        out[key] = typeof v === "string" ? JSON.parse(v) : v;
        break;
      case "SQLiteText":
        out[key] = typeof v === "string" ? v : String(v); // numeric abv → "46.0"
        break;
      case "SQLiteInteger":
        out[key] = typeof v === "number" ? v : Number(v);
        break;
      default:
        out[key] = v;
    }
  }
  return out;
}

async function countRows(db: Db, table: SQLiteTable): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(table);
  return n;
}

async function main() {
  const target = parseTargetArgs(process.argv);
  const args = parseArgs(process.argv);

  const sql = postgres(args.url, {
    max: 1,
    onnotice: () => {},
    // Keep timestamps as raw text so they are interpreted exactly like Drizzle did (no local TZ).
    types: {
      rawTimestamp: {
        to: PG_TIMESTAMP,
        from: [PG_TIMESTAMP, PG_TIMESTAMPTZ],
        serialize: (x: unknown) => String(x),
        parse: (x: string) => x,
      },
    },
  });
  const { db, dispose } = await getD1(target);
  let failed = false;
  try {
    // 1. Read everything first (the old DB is small), checking for columns we would drop.
    const source = new Map<string, Record<string, unknown>[]>();
    for (const { name, table } of TABLES) {
      const rows = (await sql.unsafe(`select * from "${name}"`)) as unknown as Record<string, unknown>[];
      const targetCols = new Set(Object.values(getTableColumns(table)).map((c) => c.name));
      const srcCols = rows.length ? Object.keys(rows[0]) : [];
      const dropped = srcCols.filter((c) => !targetCols.has(c));
      if (dropped.length) throw new Error(`${name}: source columns missing in D1 schema: ${dropped.join(", ")}`);
      source.set(name, rows);
    }

    // 2. Target must be empty (or --force).
    const nonEmpty: string[] = [];
    for (const { name, table } of [...TABLES, ...AUTH_TABLES]) {
      const n = await countRows(db, table);
      if (n > 0) nonEmpty.push(`${name} (${n})`);
    }
    if (nonEmpty.length) {
      if (!args.force) {
        throw new Error(`Target ${target.label} is not empty: ${nonEmpty.join(", ")}. Re-run with --force to replace.`);
      }
      console.log(`--force: deleting existing rows in ${target.label}: ${nonEmpty.join(", ")}`);
      const reverse = [...AUTH_TABLES, ...TABLES.slice().reverse()];
      await db.batch(reverse.map(({ table }) => db.delete(table)) as [any, ...any[]]);
    }

    // 3. Copy table by table, in FK order.
    const report: Array<{ table: string; read: number; written: number }> = [];
    for (const { name, table } of TABLES) {
      const rows = source.get(name)!.map((r) => convertRow(name, table, r));
      await insertChunked(db, table, rows as any[]);
      const written = await countRows(db, table);
      report.push({ table: name, read: rows.length, written });
      console.log(`  ${name}: read ${rows.length}, written ${written}`);
    }

    console.table(report);
    const mismatched = report.filter((r) => r.read !== r.written);
    if (mismatched.length) {
      throw new Error(`Row counts differ for: ${mismatched.map((r) => r.table).join(", ")}`);
    }
    console.log(`✅ Migrated ${report.reduce((s, r) => s + r.written, 0)} rows into ${target.label}`);
  } catch (err) {
    failed = true;
    console.error("❌ migration failed:", err);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
    await dispose().catch((e) => console.error("dispose failed:", e));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
