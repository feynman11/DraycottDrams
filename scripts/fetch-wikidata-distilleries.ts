/**
 * Fetch whisky-producing distilleries from Wikidata (CC0) and write to a static JSON file.
 *
 * Usage:
 *   bun run data:fetch:distilleries:wikidata -- --out data/distilleries.wikidata.json --page-size 200 --max 2000
 *
 * Notes:
 * - This hits Wikidata SPARQL; it may rate-limit or intermittently 5xx. We retry with backoff.
 * - Output coordinates are [lon, lat] to match the app.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type DistilleryRow = {
  source: "wikidata";
  wikidataId: string; // Qxxx
  name: string;
  coordinates: [number, number];
  country: string;
  region: string;
  website?: string;
  description?: string;
  founded?: number;
};

type Args = {
  out: string;
  pageSize: number;
  max: number;
  userAgent: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    out: "data/distilleries.wikidata.json",
    pageSize: 200,
    max: 5000,
    userAgent:
      process.env.WIKIDATA_USER_AGENT ||
      "DraycottDrams/1.0 (https://example.invalid; admin@draycottdrams.invalid) wikidata-fetch",
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = String(argv[++i]);
    else if (a === "--page-size") args.pageSize = Number(argv[++i]);
    else if (a === "--max") args.max = Number(argv[++i]);
    else if (a === "--user-agent") args.userAgent = String(argv[++i]);
  }

  if (!Number.isFinite(args.pageSize) || args.pageSize <= 0 || args.pageSize > 1000) {
    throw new Error("--page-size must be 1..1000");
  }
  if (!Number.isFinite(args.max) || args.max <= 0) throw new Error("--max must be > 0");

  return args;
}

async function fetchJsonWithRetry(
  url: string,
  headers: Record<string, string>,
  retries: number = 6
): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();

      // Retry on transient upstream issues / rate limiting
      if ([429, 502, 503, 504].includes(res.status) && attempt < retries) {
        const retryAfter = res.headers.get("retry-after");
        const baseMs = retryAfter ? Number(retryAfter) * 1000 : 750 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        const waitMs = Math.min(15_000, baseMs + jitter);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 1000)}`);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const waitMs = Math.min(15_000, 750 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function wikidataSearchId(label: string, userAgent: string): Promise<string | null> {
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=" +
    encodeURIComponent(label);
  const json = await fetchJsonWithRetry(url, { "user-agent": userAgent, accept: "application/json" });
  const id = json?.search?.[0]?.id as string | undefined;
  return id && /^Q\d+$/.test(id) ? id : null;
}

function parseWktPoint(wkt: string): [number, number] | null {
  // Example: "Point(-3.217 57.483)"
  const m = String(wkt).match(/Point\(([-0-9.]+)\s+([-0-9.]+)\)/);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function parseWikidataIdFromEntityUri(uri: string): string | null {
  const m = String(uri).match(/\/entity\/(Q\d+)$/);
  return m ? m[1] : null;
}

async function fetchPage(
  classIds: string[],
  offset: number,
  limit: number,
  userAgent: string
): Promise<DistilleryRow[]> {
  // Use wd:Qxxx values directly.
  const values = classIds.map((id) => `wd:${id}`).join(" ");

  // IMPORTANT: SPARQL joins can create multiple rows per item (e.g. multiple P131 values).
  // We GROUP BY item and SAMPLE optional fields to keep paging stable and reduce duplicates.
  // Using rdfs:label instead of SERVICE wikibase:label to avoid GROUP BY conflicts.
  const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT
  ?item
  (SAMPLE(?itemLabel) AS ?itemLabel)
  (SAMPLE(?coord) AS ?coord)
  (SAMPLE(?countryLabel) AS ?countryLabel)
  (SAMPLE(?adminLabel) AS ?adminLabel)
  (SAMPLE(?website) AS ?website)
  (SAMPLE(?desc) AS ?desc)
  (SAMPLE(?inception) AS ?inception)
WHERE {
  VALUES ?whiskyDistilleryClass { ${values} }
  ?item wdt:P31/wdt:P279* ?whiskyDistilleryClass .
  ?item wdt:P625 ?coord .
  OPTIONAL { 
    ?item rdfs:label ?itemLabel .
    FILTER(LANG(?itemLabel) = "en") .
  }
  OPTIONAL { 
    ?item wdt:P17 ?country .
    ?country rdfs:label ?countryLabel .
    FILTER(LANG(?countryLabel) = "en") .
  }
  OPTIONAL { 
    ?item wdt:P131 ?admin .
    ?admin rdfs:label ?adminLabel .
    FILTER(LANG(?adminLabel) = "en") .
  }
  OPTIONAL { ?item wdt:P856 ?website . }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL {
    ?item schema:description ?desc .
    FILTER(LANG(?desc) = "en") .
  }
}
GROUP BY ?item
LIMIT ${limit}
OFFSET ${offset}
`;

  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const data = await fetchJsonWithRetry(url, {
    accept: "application/sparql-results+json",
    "user-agent": userAgent,
  });

  const bindings: any[] = data?.results?.bindings || [];
  const out: DistilleryRow[] = [];

  for (const b of bindings) {
    const itemUri = b?.item?.value as string | undefined;
    const itemLabel = b?.itemLabel?.value as string | undefined;
    const coordWkt = b?.coord?.value as string | undefined;
    if (!itemUri || !itemLabel || !coordWkt) continue;

    const wikidataId = parseWikidataIdFromEntityUri(itemUri);
    if (!wikidataId) continue;

    const coordinates = parseWktPoint(coordWkt);
    if (!coordinates) continue;

    const country = (b?.countryLabel?.value as string | undefined) || "Unknown";
    const region = (b?.adminLabel?.value as string | undefined) || "Unknown";
    const website = (b?.website?.value as string | undefined) || undefined;
    const description = (b?.desc?.value as string | undefined) || undefined;

    let founded: number | undefined;
    const inception = (b?.inception?.value as string | undefined) || "";
    if (inception) {
      const year = Number(String(inception).slice(0, 4));
      if (Number.isFinite(year) && year > 0 && year < 3000) founded = year;
    }

    out.push({
      source: "wikidata",
      wikidataId,
      name: itemLabel,
      coordinates,
      country,
      region,
      website,
      description,
      founded,
    });
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log("🌍 Fetching distilleries from Wikidata...");
  console.log(`- out=${args.out}`);
  console.log(`- pageSize=${args.pageSize} max=${args.max}`);

  const whiskyDistillery = await wikidataSearchId("whisky distillery", args.userAgent);
  const whiskeyDistillery = await wikidataSearchId("whiskey distillery", args.userAgent);
  const classIds = [whiskyDistillery, whiskeyDistillery].filter((x): x is string => !!x);
  if (classIds.length === 0) throw new Error("Could not resolve Wikidata class ids for whisky/whiskey distillery");

  console.log(`- classIds=${classIds.join(", ")}`);

  const all = new Map<string, DistilleryRow>();
  for (let offset = 0; all.size < args.max; offset += args.pageSize) {
    const page = await fetchPage(classIds, offset, Math.min(args.pageSize, args.max - all.size), args.userAgent);
    if (page.length === 0) break;
    for (const row of page) all.set(row.wikidataId, row);
    console.log(`- fetched ${page.length} (total ${all.size})`);
    if (page.length < args.pageSize) break;
  }

  const rows = Array.from(all.values()).sort((a, b) => a.name.localeCompare(b.name));
  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, JSON.stringify(rows, null, 2) + "\n", "utf8");
  console.log(`✅ wrote ${rows.length} rows to ${args.out}`);
}

main().catch((err) => {
  console.error("❌ fetch failed:", err);
  process.exit(1);
});


