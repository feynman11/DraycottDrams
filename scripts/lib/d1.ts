/**
 * Drizzle over D1 for Node scripts (seeds, imports, one-off migrations), via wrangler's
 * `getPlatformProxy` — the same D1 binding ("DB" in wrangler.jsonc) the Worker uses.
 *
 * Target selection (CLI flags, parsed from process.argv and removed from it, so scripts' own
 * argument parsing never sees them):
 *
 *   (no flag) | --local          local D1 in .wrangler/state/v3 — the same state `vite dev` and
 *                                `wrangler d1 ... --local` use (top-level wrangler.jsonc binding)
 *   --persist-to <dir>           local D1 persisted under <dir> (same meaning as wrangler's
 *                                `--persist-to`: data lives in <dir>/v3; default is .wrangler/state)
 *   --env staging                REMOTE staging D1 ("draycottdrams-staging")
 *   --remote                     REMOTE production D1 ("draycottdrams")
 *   --remote --env staging       REMOTE staging (same as --env staging)
 *   --local --env staging        local D1 for the staging binding (rarely useful)
 *
 * Remote works by writing a derived copy of wrangler.jsonc to .wrangler/tmp/ with `"remote": true`
 * on the D1 binding (wrangler 4's remote-bindings mechanism; getPlatformProxy then proxies DB to
 * the real database). It needs `wrangler login` (or CLOUDFLARE_API_TOKEN) and real database_ids.
 *
 * Always `await dispose()` when done (it shuts down workerd / the remote proxy session).
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, experimental_readRawConfig } from "wrangler";
import { getTableColumns, type Table } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { createDb, type Db } from "@/worker/db";

export type { Db };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_PATH = path.join(REPO_ROOT, "wrangler.jsonc");
const DEFAULT_PERSIST = path.join(REPO_ROOT, ".wrangler", "state", "v3");

export type D1Target = {
  remote: boolean;
  environment?: string;
  /** Local persistence directory (only for local targets). */
  persistPath?: string;
  /** Human-readable description, e.g. "local (.wrangler/state/v3)" or "REMOTE staging". */
  label: string;
};

/** Parse target flags out of argv (mutates it: the flags are removed). */
export function parseTargetArgs(argv: string[] = process.argv): D1Target {
  let remote: boolean | undefined;
  let environment: string | undefined;
  let persistTo: string | undefined;

  for (let i = 2; i < argv.length; ) {
    const a = argv[i];
    let consumed = 0;
    if (a === "--remote") {
      remote = true;
      consumed = 1;
    } else if (a === "--local") {
      remote = false;
      consumed = 1;
    } else if (a === "--env" || a === "-e") {
      environment = argv[i + 1];
      if (!environment) throw new Error(`${a} needs a value (e.g. --env staging)`);
      consumed = 2;
    } else if (a.startsWith("--env=")) {
      environment = a.slice("--env=".length);
      consumed = 1;
    } else if (a === "--persist-to") {
      persistTo = argv[i + 1];
      if (!persistTo) throw new Error("--persist-to needs a directory");
      consumed = 2;
    }
    if (consumed) argv.splice(i, consumed);
    else i++;
  }

  // `--env <name>` alone means that environment's remote database.
  if (remote === undefined) remote = environment !== undefined && persistTo === undefined;
  if (remote && persistTo) throw new Error("--persist-to only applies to local targets");

  if (remote) {
    return { remote, environment, label: `REMOTE ${environment ?? "production"}` };
  }
  const persistPath = persistTo ? path.resolve(process.cwd(), persistTo, "v3") : DEFAULT_PERSIST;
  return {
    remote,
    environment,
    persistPath,
    label: `local${environment ? ` ${environment}` : ""} (${path.relative(process.cwd(), persistPath) || "."})`,
  };
}

/** Write a copy of wrangler.jsonc with `remote: true` on every D1 binding; returns its path. */
export function writeRemoteConfig(): string {
  const { rawConfig } = experimental_readRawConfig({ config: CONFIG_PATH });
  const cfg = JSON.parse(JSON.stringify(rawConfig)) as Record<string, any>;
  const markRemote = (section: Record<string, any> | undefined) => {
    if (!section) return;
    section.d1_databases = (section.d1_databases ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      remote: true,
    }));
    // Scripts only need DB; drop other remote-only bindings (AI) so no extra access is needed.
    delete section.ai;
  };
  markRemote(cfg);
  for (const env of Object.values((cfg.env ?? {}) as Record<string, Record<string, any>>)) markRemote(env);
  // Paths in the config are relative to its own location; the copy lives elsewhere.
  if (cfg.main) cfg.main = path.join(REPO_ROOT, cfg.main);
  delete cfg.$schema;

  const dir = path.join(REPO_ROOT, ".wrangler", "tmp");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `wrangler.scripts-remote.${process.pid}.json`);
  writeFileSync(file, JSON.stringify(cfg, null, 2));
  return file;
}

export type D1Handle = {
  db: Db;
  d1: D1Database;
  target: D1Target;
  dispose: () => Promise<void>;
};

/** Get a Drizzle db over the selected D1 target. Call `dispose()` when finished. */
export async function getD1(target: D1Target = parseTargetArgs()): Promise<D1Handle> {
  console.error(`[d1] target: ${target.label}`);
  let tempConfig: string | undefined;
  try {
    if (target.remote) tempConfig = writeRemoteConfig();
    // Locally, silence wrangler's noise (the "AI bindings always access remote resources" warning).
    else process.env.WRANGLER_LOG ??= "error";
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: tempConfig ?? CONFIG_PATH,
      environment: target.environment,
      persist: target.remote ? false : { path: target.persistPath! },
      // Local runs must not need a Cloudflare login (the AI binding is always remote).
      remoteBindings: target.remote,
      envFiles: [],
    });
    if (!proxy.env.DB) throw new Error("No D1 binding named DB in wrangler.jsonc");
    let disposed = false;
    return {
      db: createDb(proxy.env.DB),
      d1: proxy.env.DB,
      target,
      dispose: async () => {
        if (disposed) return;
        disposed = true;
        try {
          await proxy.dispose();
        } finally {
          if (tempConfig) rmSync(tempConfig, { force: true });
        }
      },
    };
  } catch (err) {
    if (tempConfig) rmSync(tempConfig, { force: true });
    throw err;
  }
}

/**
 * Run `fn` with a db for the target selected on the command line, always disposing afterwards.
 * Exits the process with code 1 on error.
 */
export async function withD1(fn: (handle: D1Handle) => Promise<void>): Promise<void> {
  let handle: D1Handle | undefined;
  let failed = false;
  try {
    handle = await getD1();
    await fn(handle);
  } catch (err) {
    failed = true;
    console.error("❌", err);
  } finally {
    await handle?.dispose().catch((e) => console.error("dispose failed:", e));
  }
  process.exit(failed ? 1 : 0);
}

/** D1 allows at most 100 bound parameters per statement. */
export const D1_MAX_PARAMS = 100;

/** Rows per multi-row INSERT for `table` such that rows * columns < 100. */
export function rowsPerInsert(table: Table): number {
  const cols = Object.keys(getTableColumns(table)).length;
  return Math.max(1, Math.floor((D1_MAX_PARAMS - 1) / cols));
}

/** Split into chunks of `size`. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Insert many rows, chunked to respect D1's bound-parameter limit. Chunks are sent together via
 * `db.batch` (one round trip per `statementsPerBatch` statements, each batch atomic).
 */
export async function insertChunked<T extends SQLiteTable>(
  db: Db,
  table: T,
  rows: T["$inferInsert"][],
  statementsPerBatch = 50,
): Promise<number> {
  if (rows.length === 0) return 0;
  const statements = chunk(rows, rowsPerInsert(table)).map((c) => db.insert(table).values(c as any));
  for (const group of chunk(statements, statementsPerBatch)) {
    await db.batch(group as [(typeof group)[number], ...(typeof group)[number][]]);
  }
  return rows.length;
}

/** Run Drizzle queries in `db.batch` groups (D1 has no interactive transactions). */
export async function runBatched(db: Db, queries: any[], statementsPerBatch = 50): Promise<void> {
  for (const group of chunk(queries, statementsPerBatch)) {
    if (group.length) await db.batch(group as [any, ...any[]]);
  }
}
