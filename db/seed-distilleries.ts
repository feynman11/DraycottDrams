/**
 * Seed / upsert distilleries from a static JSON dataset.
 *
 * Features:
 * - Exact match on normalized name
 * - Fuzzy match on name to merge potential duplicates (Dice coefficient)
 * - Coordinate correction for existing records when difference exceeds a threshold (km)
 *
 * Usage:
 *   bun run db:seed:distilleries -- --file data/distilleries.wikidata.json --dry-run
 *   bun run db:seed:distilleries -- --file data/distilleries.wikidata.json --threshold 0.92 --max-keep-distance-km 2
 *   bun run db:seed:distilleries -- --file data/distilleries.wikidata.json --force-coordinates
 */

import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { distilleries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bestFuzzyMatch, normalizeForMatch, tokenSignature } from "@/lib/fuzzy-match";
import { haversineDistanceKm } from "@/lib/geo";

type DatasetDistillery = {
  name: string;
  country?: string;
  region?: string;
  coordinates?: [number, number];
  website?: string;
  description?: string;
  founded?: number;
  // extra fields (ignored by seed)
  source?: string;
  wikidataId?: string;
};

type Args = {
  file: string;
  dryRun: boolean;
  threshold: number;
  maxKeepDistanceKm: number;
  forceCoordinates: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    file: "data/distilleries.wikidata.json",
    dryRun: false,
    threshold: 0.92,
    maxKeepDistanceKm: 2,
    forceCoordinates: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = String(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--threshold") args.threshold = Number(argv[++i]);
    else if (a === "--max-keep-distance-km") args.maxKeepDistanceKm = Number(argv[++i]);
    else if (a === "--force-coordinates") args.forceCoordinates = true;
  }

  if (!Number.isFinite(args.threshold) || args.threshold <= 0 || args.threshold > 1) {
    throw new Error("--threshold must be in (0,1]");
  }
  if (!Number.isFinite(args.maxKeepDistanceKm) || args.maxKeepDistanceKm < 0) {
    throw new Error("--max-keep-distance-km must be >= 0");
  }
  return args;
}

function safeText(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
}

function safeNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function safeCoords(v: unknown): [number, number] | undefined {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const lon = Number(v[0]);
  const lat = Number(v[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined;
  return [lon, lat];
}

function bucketKey(name: string): string {
  const n = normalizeForMatch(name);
  return (n[0] || "#") as string;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log("🏭 Distillery seed/upsert");
  console.log(`- file=${args.file} dryRun=${args.dryRun}`);
  console.log(`- threshold=${args.threshold} maxKeepDistanceKm=${args.maxKeepDistanceKm} forceCoordinates=${args.forceCoordinates}`);

  const raw = await readFile(args.file, "utf8");
  const parsed = JSON.parse(raw) as DatasetDistillery[];
  const dataset = parsed
    .map((d) => ({
      name: safeText(d.name) || "",
      country: safeText(d.country) || "Unknown",
      region: safeText(d.region) || "Unknown",
      coordinates: safeCoords(d.coordinates),
      website: safeText(d.website),
      description: safeText(d.description),
      founded: safeNumber(d.founded),
    }))
    .filter((d) => d.name);

  // De-dupe dataset by token signature + country (helps avoid obvious duplicates).
  const datasetDeduped = new Map<string, (typeof dataset)[number]>();
  for (const d of dataset) {
    const key = `${tokenSignature(d.name)}|${normalizeForMatch(d.country)}`;
    if (!datasetDeduped.has(key)) datasetDeduped.set(key, d);
  }
  const rows = Array.from(datasetDeduped.values());
  console.log(`- dataset rows: ${dataset.length} (deduped to ${rows.length})`);

  const existing = await db.select().from(distilleries);
  const byNorm = new Map<string, (typeof existing)[number]>();
  const bySig = new Map<string, (typeof existing)[number]>();
  const buckets = new Map<string, Array<(typeof existing)[number]>>();

  for (const ex of existing) {
    const n = normalizeForMatch(ex.name);
    if (n) byNorm.set(n, ex);
    const sig = tokenSignature(ex.name);
    if (sig) bySig.set(sig, ex);
    const b = bucketKey(ex.name);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(ex);
  }

  let inserts = 0;
  let updates = 0;
  let coordUpdates = 0;
  let merges = 0;
  let skipped = 0;

  for (const d of rows) {
    const norm = normalizeForMatch(d.name);
    const sig = tokenSignature(d.name);

    let match = (norm && byNorm.get(norm)) || (sig && bySig.get(sig)) || null;

    if (!match) {
      // Fuzzy match within a small bucket (same first normalized char) to keep it cheap.
      const bucket = buckets.get(bucketKey(d.name)) || [];
      const candidates = bucket.map((ex) => ({ value: ex, text: ex.name }));
      const best = bestFuzzyMatch(d.name, candidates);
      if (best && best.score >= args.threshold) {
        match = best.value;
      }
    }

    if (!match) {
      // Insert new distillery
      inserts++;
      if (!args.dryRun) {
        await db.insert(distilleries).values({
          name: d.name,
          country: d.country || "Unknown",
          region: d.region || "Unknown",
          coordinates: d.coordinates,
          website: d.website,
          description: d.description,
          founded: d.founded,
        });
      }
      continue;
    }

    // Merge/update existing.
    const patch: Partial<typeof distilleries.$inferInsert> = {};

    // Improve Unknown/empty country/region only (avoid clobbering admin edits)
    if ((!match.country || match.country === "Unknown") && d.country && d.country !== "Unknown") patch.country = d.country;
    if ((!match.region || match.region === "Unknown") && d.region && d.region !== "Unknown") patch.region = d.region;

    if (!match.website && d.website) patch.website = d.website;
    if (!match.description && d.description) patch.description = d.description;
    if (!match.founded && d.founded) patch.founded = d.founded;

    // Coordinate correction
    if (d.coordinates) {
      if (!match.coordinates) {
        patch.coordinates = d.coordinates;
        coordUpdates++;
      } else if (args.forceCoordinates) {
        patch.coordinates = d.coordinates;
        coordUpdates++;
      } else {
        const distKm = haversineDistanceKm(match.coordinates as [number, number], d.coordinates);
        if (distKm > args.maxKeepDistanceKm) {
          patch.coordinates = d.coordinates;
          coordUpdates++;
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    updates++;
    merges++;
    if (!args.dryRun) {
      await db
        .update(distilleries)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(distilleries.id, match.id));
    }
  }

  console.log("✅ summary");
  console.log(`- existing: ${existing.length}`);
  console.log(`- inserted: ${inserts}`);
  console.log(`- updated: ${updates}`);
  console.log(`- coordUpdates: ${coordUpdates}`);
  console.log(`- mergedByFuzzyOrSig: ${merges}`);
  console.log(`- skippedNoChange: ${skipped}`);
  if (args.dryRun) console.log("🧪 dry-run: no DB changes applied");
}

main().catch((err) => {
  console.error("❌ seed failed:", err);
  process.exit(1);
});


