/**
 * AI review of the site's data: the model checks distilleries (country, region, founded, website,
 * description), whiskies (ABV, variety spelling) and likely duplicate distilleries against what it
 * knows, and returns suggestions. Nothing is written until an admin accepts a suggestion
 * (`applySuggestions`). Coordinates are not suggested: model-recalled coordinates are unreliable.
 */
import { distilleries, gatherings, whiskies } from "@/db/schema";
import { diceCoefficient, normalizeForMatch } from "@/lib/fuzzy-match";
import type { Db } from "@/worker/db";
import { complete } from "@/worker/routers/ai";
import { asc, eq, sql } from "drizzle-orm";

export type ReviewScope = "distilleries" | "whiskies" | "duplicates";

export const DISTILLERY_FIELDS = ["name", "country", "region", "founded", "website", "description"] as const;
export const WHISKY_FIELDS = ["abv", "variety"] as const;
export type DistilleryField = (typeof DISTILLERY_FIELDS)[number];
export type WhiskyField = (typeof WHISKY_FIELDS)[number];

export type Confidence = "high" | "medium" | "low";

export type Suggestion =
  | {
      kind: "update";
      key: string;
      entity: "distillery";
      targetId: string;
      label: string;
      field: DistilleryField;
      current: string | null;
      suggested: string;
      reason: string;
      confidence: Confidence;
    }
  | {
      kind: "update";
      key: string;
      entity: "whisky";
      targetId: string;
      label: string;
      field: WhiskyField;
      current: string | null;
      suggested: string;
      reason: string;
      confidence: Confidence;
    }
  | {
      kind: "merge";
      key: string;
      keepId: string;
      keepName: string;
      removeId: string;
      removeName: string;
      whiskyCount: number; // whiskies that move to the kept distillery
      reason: string;
      confidence: Confidence;
    };

export type ReviewPage = { suggestions: Suggestion[]; nextOffset: number | null; total: number };

const PAGE_SIZE: Record<ReviewScope, number> = { distilleries: 12, whiskies: 20, duplicates: 20 };

function confidenceOf(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

async function askJson(env: Env, system: string, user: unknown): Promise<Record<string, unknown>> {
  const text = await complete(env, [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(user) },
  ], true, 3000);
  const parsed = JSON.parse(text);
  return typeof parsed === "object" && parsed !== null ? parsed : {};
}

const sameValue = (a: string | null, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

// Distilleries that appear in at least one tasting, with how many
async function clubDistilleries(db: Db) {
  return db
    .select({
      id: distilleries.id,
      name: distilleries.name,
      country: distilleries.country,
      region: distilleries.region,
      founded: distilleries.founded,
      website: distilleries.website,
      description: distilleries.description,
      coordinates: distilleries.coordinates,
      whiskyCount: sql<number>`count(${whiskies.id})`,
    })
    .from(distilleries)
    .innerJoin(whiskies, eq(whiskies.distilleryId, distilleries.id))
    .groupBy(distilleries.id)
    .orderBy(asc(distilleries.name));
}

function validDistilleryValue(field: DistilleryField, value: string): string | null {
  const v = value.trim();
  if (!v || v.length > 600) return null;
  if (field === "founded") {
    const year = parseInt(v);
    return year >= 1600 && year <= new Date().getFullYear() ? String(year) : null;
  }
  if (field === "website") {
    try {
      const url = new URL(v);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }
  return v;
}

async function reviewDistilleries(db: Db, env: Env, offset: number): Promise<ReviewPage> {
  const all = await clubDistilleries(db);
  const page = all.slice(offset, offset + PAGE_SIZE.distilleries);
  const countries = [...new Set(all.map((d) => d.country).filter(Boolean))].sort();
  const regions = [...new Set(all.map((d) => d.region).filter(Boolean))].sort();

  const system = `You review distillery records for a UK whisky club's website and suggest corrections from your own knowledge.
Suggest a change only when you are confident the current value is wrong or missing. Do not restate values that are already right.
Conventions: "country" is the country name (Scotland, England, Wales, Northern Ireland, Ireland, Japan, ...; never an adjective like "Irish"). For Scotland, "region" is one of Highland, Speyside, Islay, Lowland, Campbeltown, Island. Elsewhere "region" is the county, state or area. Countries already used: ${countries.join(", ")}. Regions already used: ${regions.join(", ")}.
"name" is the distillery's usual name; fix only clear misspellings. "founded" is the year whisky distilling began at that site. "website" is the official site only if you are sure of the address. "description" is one or two complete, factual sentences starting with the name, suggested only when it is missing.
Leave out anything you are unsure of. Use "high" confidence only for widely documented facts, "medium" when you are fairly sure, and "low" otherwise.
Some records are brands, bottlers or blends rather than distilleries; describe them as such.
Reply with JSON only: {"suggestions":[{"ref":"d1","field":"country|region|name|founded|website|description","suggested":"new value","reason":"short reason","confidence":"high|medium|low"}]}`;

  const result = await askJson(env, system, {
    distilleries: page.map((d, i) => ({
      ref: `d${i + 1}`,
      name: d.name,
      country: d.country,
      region: d.region,
      founded: d.founded,
      website: d.website,
      description: d.description?.slice(0, 300) ?? null,
    })),
  });

  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(result.suggestions) ? result.suggestions : []) {
    const s = raw as Record<string, unknown>;
    const d = page[parseInt(String(s.ref ?? "").replace(/^d/, "")) - 1];
    const field = s.field as DistilleryField;
    if (!d || !DISTILLERY_FIELDS.includes(field) || typeof s.suggested !== "string" && typeof s.suggested !== "number") continue;
    const suggested = validDistilleryValue(field, String(s.suggested));
    const current = d[field] === null || d[field] === undefined ? null : String(d[field]);
    const key = `distillery:${d.id}:${field}`;
    if (!suggested || sameValue(current, suggested) || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      kind: "update",
      key,
      entity: "distillery",
      targetId: d.id,
      label: d.name,
      field,
      current,
      suggested,
      reason: typeof s.reason === "string" ? s.reason.slice(0, 300) : "",
      confidence: confidenceOf(s.confidence),
    });
  }
  const next = offset + PAGE_SIZE.distilleries;
  return { suggestions, nextOffset: next < all.length ? next : null, total: all.length };
}

async function reviewWhiskies(db: Db, env: Env, offset: number): Promise<ReviewPage> {
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(whiskies);
  const page = await db
    .select({
      id: whiskies.id,
      variety: whiskies.variety,
      abv: whiskies.abv,
      distillery: distilleries.name,
      country: distilleries.country,
      gathering: gatherings.number,
    })
    .from(whiskies)
    .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
    .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
    .orderBy(asc(gatherings.number), asc(whiskies.id))
    .limit(PAGE_SIZE.whiskies)
    .offset(offset);

  const system = `You review whisky tasting records for a UK whisky club and suggest corrections from your own knowledge.
Each record is a bottling: distillery, variety (the expression, e.g. "12yo", "Uigeadail", "Distillers Edition") and ABV in percent.
Suggest "abv" only when the bottling is a well-known core expression and the recorded ABV clearly differs from its standard strength (e.g. Lagavulin 16yo is 43). Many bottlings are single casks, batches or travel-retail editions with their own strength: leave those alone.
Suggest "variety" only to fix a clear misspelling of an expression name (e.g. "Uigeadial" → "Uigeadail"); keep the club's style such as "12yo".
Leave out anything you are unsure of. Use "high" confidence only for widely documented facts.
Reply with JSON only: {"suggestions":[{"ref":"w1","field":"abv|variety","suggested":"new value","reason":"short reason","confidence":"high|medium|low"}]}`;

  const result = await askJson(env, system, {
    whiskies: page.map((w, i) => ({ ref: `w${i + 1}`, distillery: w.distillery, country: w.country, variety: w.variety, abv: w.abv })),
  });

  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(result.suggestions) ? result.suggestions : []) {
    const s = raw as Record<string, unknown>;
    const w = page[parseInt(String(s.ref ?? "").replace(/^w/, "")) - 1];
    const field = s.field as WhiskyField;
    if (!w || !WHISKY_FIELDS.includes(field)) continue;
    let suggested = String(s.suggested ?? "").replace("%", "").trim();
    if (field === "abv") {
      const n = parseFloat(suggested);
      if (!(n >= 20 && n <= 80) || Math.abs(n - parseFloat(w.abv)) < 0.05) continue;
      suggested = String(Math.round(n * 100) / 100);
    } else if (!suggested || suggested.length > 200 || sameValue(w.variety, suggested)) {
      continue;
    }
    const key = `whisky:${w.id}:${field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      kind: "update",
      key,
      entity: "whisky",
      targetId: w.id,
      label: `G${w.gathering} · ${w.distillery} ${w.variety}`.trim(),
      field,
      current: field === "abv" ? w.abv : w.variety,
      suggested,
      reason: typeof s.reason === "string" ? s.reason.slice(0, 300) : "",
      confidence: confidenceOf(s.confidence),
    });
  }
  const next = offset + PAGE_SIZE.whiskies;
  return { suggestions, nextOffset: next < total ? next : null, total };
}

// Similar-looking names among all distilleries where at least one side is used in a tasting
async function duplicatePairs(db: Db) {
  const [rows, counts] = await Promise.all([
    db.select({ id: distilleries.id, name: distilleries.name, country: distilleries.country, region: distilleries.region })
      .from(distilleries)
      .orderBy(asc(distilleries.name)),
    db.select({ distilleryId: whiskies.distilleryId, n: sql<number>`count(*)` }).from(whiskies).groupBy(whiskies.distilleryId),
  ]);
  const countById = new Map(counts.map((c) => [c.distilleryId, c.n]));
  const all = rows.map((d) => ({ ...d, whiskyCount: countById.get(d.id) ?? 0 }));
  const pairs: { a: (typeof all)[number]; b: (typeof all)[number]; score: number }[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.whiskyCount === 0 && b.whiskyCount === 0) continue;
      const na = normalizeForMatch(a.name), nb = normalizeForMatch(b.name);
      const score = na === nb ? 1 : diceCoefficient(a.name, b.name);
      if (score >= 0.75) pairs.push({ a, b, score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

async function reviewDuplicates(db: Db, env: Env, offset: number): Promise<ReviewPage> {
  const pairs = await duplicatePairs(db);
  const page = pairs.slice(offset, offset + PAGE_SIZE.duplicates);
  const suggestions: Suggestion[] = [];
  if (page.length > 0) {
    const system = `You check whether pairs of records in a whisky club's distillery list are the same distillery entered twice (typos, spacing, a "distillery" suffix).
Distinct distilleries with similar names (e.g. Glen Moray and Glenmorangie, Port Charlotte and Port Ellen) are NOT the same.
For each pair say whether they are the same and which record has the correct name.
Reply with JSON only: {"pairs":[{"ref":"p1","same":true|false,"keep":"a"|"b","reason":"short reason","confidence":"high|medium|low"}]}`;
    const result = await askJson(env, system, {
      pairs: page.map((p, i) => ({
        ref: `p${i + 1}`,
        a: { name: p.a.name, country: p.a.country, region: p.a.region },
        b: { name: p.b.name, country: p.b.country, region: p.b.region },
      })),
    });
    for (const raw of Array.isArray(result.pairs) ? result.pairs : []) {
      const r = raw as Record<string, unknown>;
      const pair = page[parseInt(String(r.ref ?? "").replace(/^p/, "")) - 1];
      if (!pair || r.same !== true) continue;
      const [keep, remove] = r.keep === "b" ? [pair.b, pair.a] : [pair.a, pair.b];
      suggestions.push({
        kind: "merge",
        key: `merge:${remove.id}:${keep.id}`,
        keepId: keep.id,
        keepName: keep.name,
        removeId: remove.id,
        removeName: remove.name,
        whiskyCount: remove.whiskyCount,
        reason: typeof r.reason === "string" ? r.reason.slice(0, 300) : "",
        confidence: confidenceOf(r.confidence),
      });
    }
  }
  const next = offset + PAGE_SIZE.duplicates;
  return { suggestions, nextOffset: next < pairs.length ? next : null, total: pairs.length };
}

export async function reviewData(db: Db, env: Env, scope: ReviewScope, offset: number): Promise<ReviewPage> {
  if (scope === "distilleries") return reviewDistilleries(db, env, offset);
  if (scope === "whiskies") return reviewWhiskies(db, env, offset);
  return reviewDuplicates(db, env, offset);
}

export type AcceptedSuggestion =
  | { kind: "update"; entity: "distillery"; targetId: string; field: DistilleryField; value: string }
  | { kind: "update"; entity: "whisky"; targetId: string; field: WhiskyField; value: string }
  | { kind: "merge"; keepId: string; removeId: string };

/** Apply accepted suggestions one by one; returns the outcome of each (a failure doesn't stop the rest). */
export async function applySuggestions(db: Db, items: AcceptedSuggestion[]) {
  const results: { ok: boolean; error?: string }[] = [];
  for (const item of items) {
    try {
      const now = new Date();
      if (item.kind === "merge") {
        if (item.keepId === item.removeId) throw new Error("Cannot merge a distillery into itself");
        const [keep] = await db.select().from(distilleries).where(eq(distilleries.id, item.keepId));
        const [remove] = await db.select().from(distilleries).where(eq(distilleries.id, item.removeId));
        if (!keep || !remove) throw new Error("Distillery not found (already merged?)");
        // Keep the survivor's values; fill its gaps from the duplicate
        await db.batch([
          db.update(whiskies).set({ distilleryId: keep.id, updatedAt: now }).where(eq(whiskies.distilleryId, remove.id)),
          db.update(distilleries).set({
            coordinates: keep.coordinates ?? remove.coordinates,
            description: keep.description ?? remove.description,
            website: keep.website ?? remove.website,
            founded: keep.founded ?? remove.founded,
            updatedAt: now,
          }).where(eq(distilleries.id, keep.id)),
          db.delete(distilleries).where(eq(distilleries.id, remove.id)),
        ]);
      } else if (item.entity === "distillery") {
        const value = validDistilleryValue(item.field, item.value);
        if (!value) throw new Error(`Invalid ${item.field}`);
        const set = item.field === "founded" ? { founded: parseInt(value) } : { [item.field]: value };
        const updated = await db.update(distilleries).set({ ...set, updatedAt: now }).where(eq(distilleries.id, item.targetId)).returning({ id: distilleries.id });
        if (updated.length === 0) throw new Error("Distillery not found");
      } else {
        const value = item.value.trim();
        if (item.field === "abv" && !(parseFloat(value) > 0 && parseFloat(value) <= 100)) throw new Error("Invalid ABV");
        if (!value) throw new Error(`Invalid ${item.field}`);
        const updated = await db.update(whiskies).set({ [item.field]: value, updatedAt: now }).where(eq(whiskies.id, item.targetId)).returning({ id: whiskies.id });
        if (updated.length === 0) throw new Error("Whisky not found");
      }
      results.push({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed";
      results.push({ ok: false, error: message.includes("UNIQUE") ? "Another distillery already has that name: merge them instead" : message });
    }
  }
  return results;
}

