/**
 * Import whisky-producing distilleries from Wikidata (CC0) into `distilleries`.
 *
 * Usage:
 *   npx tsx scripts/import-wikidata-distilleries.ts --limit 2000 --offset 0
 *   npx tsx scripts/import-wikidata-distilleries.ts --limit 2000 --offset 0 --dry-run
 *
 * Notes:
 * - We only UPDATE existing rows when we can add missing info (coords/website/description/founded),
 *   to avoid clobbering admin-edited data.
 * - `region` is required by schema. We set it to the best available admin area label; otherwise "Unknown".
 */

import { db } from "@/lib/db";
import { distilleries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type Args = {
  limit: number;
  offset: number;
  dryRun: boolean;
  userAgent: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    limit: 2000,
    offset: 0,
    dryRun: false,
    userAgent:
      process.env.WIKIDATA_USER_AGENT ||
      "DraycottDrams/1.0 (https://example.invalid; admin@draycottdrams.invalid) wikidata-import",
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--offset") args.offset = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--user-agent") args.userAgent = String(argv[++i]);
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) throw new Error("--limit must be a positive number");
  if (!Number.isFinite(args.offset) || args.offset < 0) throw new Error("--offset must be >= 0");

  return args;
}

function parseWktPoint(wkt: string): [number, number] | null {
  // Example: "Point(-3.217 57.483)"
  const m = wkt.match(/Point\(([-0-9.]+)\s+([-0-9.]+)\)/);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function fetchJsonWithRetry(
  url: string,
  opts: { headers: Record<string, string> },
  retries: number = 5
): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: opts.headers });
      if (res.ok) return await res.json();

      // Retry on transient upstream issues / rate limiting
      if ([429, 502, 503, 504].includes(res.status) && attempt < retries) {
        const retryAfter = res.headers.get("retry-after");
        const baseMs = retryAfter ? Number(retryAfter) * 1000 : 500 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        const waitMs = Math.min(10_000, baseMs + jitter);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 1000)}`);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const waitMs = Math.min(10_000, 500 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function fetchWikidataRows(args: Args): Promise<
  Array<{
    name: string;
    coordinates: [number, number];
    country: string;
    region: string;
    website?: string;
    description?: string;
    founded?: number;
  }>
> {
  // We resolve class Q-ids via a tiny SPARQL query first, then use those Q-ids in the main query.
  // This avoids expensive label-matching in the main query (which can time out).

  const classIds = await resolveWikidataEntityIds(args, ["whisky distillery", "whiskey distillery"]);
  if (classIds.length === 0) {
    throw new Error("Could not resolve Wikidata class ids for 'whisky distillery'/'whiskey distillery'");
  }

  const classValues = classIds.map((uri) => `<${uri}>`).join(" ");

  const query = `
SELECT ?item ?itemLabel ?coord ?countryLabel ?adminLabel ?website ?desc ?inception WHERE {
  VALUES ?whiskyDistilleryClass { ${classValues} }
  ?item wdt:P31/wdt:P279* ?whiskyDistilleryClass .

  ?item wdt:P625 ?coord .

  OPTIONAL { ?item wdt:P17 ?country . }
  OPTIONAL { ?item wdt:P131 ?admin . }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P571 ?inception . }

  OPTIONAL {
    ?item schema:description ?desc .
    FILTER(LANG(?desc) = "en") .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${args.limit}
OFFSET ${args.offset}
`;

  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const data = (await fetchJsonWithRetry(url, {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": args.userAgent,
    },
  })) as any;

  const bindings: any[] = data?.results?.bindings || [];
  const rows: Array<{
    name: string;
    coordinates: [number, number];
    country: string;
    region: string;
    website?: string;
    description?: string;
    founded?: number;
  }> = [];

  for (const b of bindings) {
    const name = b?.itemLabel?.value as string | undefined;
    const coordWkt = b?.coord?.value as string | undefined;
    if (!name || !coordWkt) continue;
    const coordinates = parseWktPoint(coordWkt);
    if (!coordinates) continue;

    const country = (b?.countryLabel?.value as string | undefined) || "Unknown";
    const region = (b?.adminLabel?.value as string | undefined) || "Unknown";
    const website = (b?.website?.value as string | undefined) || undefined;
    const description = (b?.desc?.value as string | undefined) || undefined;

    // inception can be a full datetime; we store year if we can parse it.
    let founded: number | undefined;
    const inception = (b?.inception?.value as string | undefined) || "";
    if (inception) {
      const year = Number(String(inception).slice(0, 4));
      if (Number.isFinite(year) && year > 0 && year < 3000) founded = year;
    }

    rows.push({
      name,
      coordinates,
      country,
      region,
      website,
      description,
      founded,
    });
  }

  return rows;
}

async function resolveWikidataEntityIds(args: Args, englishLabels: string[]): Promise<string[]> {
  const values = englishLabels.map((l) => `"${l.replace(/"/g, '\\"')}"`).join(" ");
  const query = `
SELECT ?entity WHERE {
  VALUES ?labelText { ${values} }
  ?entity rdfs:label ?label .
  FILTER(LANG(?label) = "en") .
  FILTER(STR(?label) = ?labelText) .
}
`;

  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const data = (await fetchJsonWithRetry(url, {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": args.userAgent,
    },
  })) as any;
  const bindings: any[] = data?.results?.bindings || [];
  const ids: string[] = [];
  for (const b of bindings) {
    const uri = b?.entity?.value as string | undefined;
    if (uri && uri.startsWith("http")) ids.push(uri);
  }
  return Array.from(new Set(ids));
}

async function getCurrentStats() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(distilleries);

  const [{ missingCoords }] = await db
    .select({
      missingCoords: sql<number>`count(*) filter (where ${distilleries.coordinates} is null)`,
    })
    .from(distilleries);

  return { total: total ?? 0, missingCoords: missingCoords ?? 0 };
}

async function main() {
  const args = parseArgs(process.argv);

  console.log("🌍 Wikidata distillery import");
  console.log(`- limit=${args.limit} offset=${args.offset} dryRun=${args.dryRun}`);

  const before = await getCurrentStats();
  console.log(`- before: ${before.total} distilleries (${before.missingCoords} missing coordinates)`);

  const wikidataRows = await fetchWikidataRows(args);
  console.log(`- fetched: ${wikidataRows.length} rows from Wikidata`);

  // De-dupe by name within the fetched page.
  const deduped = new Map<string, (typeof wikidataRows)[number]>();
  for (const row of wikidataRows) {
    const key = normalizeName(row.name);
    if (!key) continue;
    if (!deduped.has(key)) deduped.set(key, row);
  }
  const rows = Array.from(deduped.values());
  console.log(`- after de-dupe: ${rows.length} unique names`);

  // Load existing distilleries once.
  const existing = await db.select().from(distilleries);
  const existingByName = new Map<string, (typeof existing)[number]>();
  for (const d of existing) existingByName.set(normalizeName(d.name), d);

  const toInsert: Array<typeof distilleries.$inferInsert> = [];
  const toUpdate: Array<{
    id: string;
    patch: Partial<typeof distilleries.$inferInsert>;
  }> = [];

  for (const row of rows) {
    const key = normalizeName(row.name);
    const ex = existingByName.get(key);

    if (!ex) {
      toInsert.push({
        name: row.name,
        country: row.country || "Unknown",
        region: row.region || "Unknown",
        coordinates: row.coordinates,
        website: row.website,
        description: row.description,
        founded: row.founded,
      });
      continue;
    }

    // Only fill missing fields, never overwrite populated values.
    const patch: Partial<typeof distilleries.$inferInsert> = {};
    if (!ex.coordinates && row.coordinates) patch.coordinates = row.coordinates;
    if (!ex.website && row.website) patch.website = row.website;
    if (!ex.description && row.description) patch.description = row.description;
    if (!ex.founded && row.founded) patch.founded = row.founded;

    // If existing country/region are "Unknown"/empty, improve them.
    if ((!ex.country || ex.country === "Unknown") && row.country) patch.country = row.country;
    if ((!ex.region || ex.region === "Unknown") && row.region) patch.region = row.region;

    if (Object.keys(patch).length > 0) {
      toUpdate.push({ id: ex.id, patch });
    }
  }

  console.log(`- plan: insert ${toInsert.length}, update ${toUpdate.length}`);

  if (args.dryRun) {
    console.log("🧪 dry-run: no DB changes applied");
    return;
  }

  // Insert in chunks to avoid overly large queries.
  const CHUNK = 500;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    await db.insert(distilleries).values(chunk);
  }

  // Updates are usually far fewer; keep it safe/simple.
  for (const u of toUpdate) {
    await db
      .update(distilleries)
      .set({ ...u.patch, updatedAt: new Date() })
      .where(eq(distilleries.id, u.id));
  }

  const after = await getCurrentStats();
  console.log(`✅ done`);
  console.log(`- after: ${after.total} distilleries (${after.missingCoords} missing coordinates)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ import failed:", err);
    process.exit(1);
  });


