/**
 * Importing the chair's Drams sheet: `planImport` compares the sheet with the database and
 * returns what would change (nothing is written); `applyImport` re-plans with the admin's
 * distillery choices and writes the result in D1 batches.
 *
 * Distilleries are matched exact → normalised → fuzzy, and names still in doubt go to Workers AI
 * with a shortlist of candidates. Empty sheet cells never blank existing values.
 */
import { distilleries, gatherings, members, whiskies } from "@/db/schema";
import { parseRanking, type DramsSheetRow } from "@/lib/drams-sheet";
import { diceCoefficient, normalizeForMatch, tokenSignature } from "@/lib/fuzzy-match";
import { getDistilleryCoordinates } from "@/lib/distillery-coordinates";
import { chunk, maxInsertRows, runBatched, type Db } from "@/worker/db";
import { complete } from "@/worker/routers/ai";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export type MatchMethod = "exact" | "fuzzy" | "ai" | "new" | "manual";

export type DistilleryCandidate = { id: string; name: string; country: string; region: string; score: number };

export type DistilleryMatch = {
  key: string; // normalised sheet spelling; rows with the same key share one match
  sheetName: string;
  sheetCountry: string;
  sheetRegion: string;
  rowCount: number;
  method: MatchMethod;
  distilleryId: string | null; // null: a new distillery is created from `create`
  matchedName: string | null;
  confidence: number; // 0..1
  reason: string | null;
  create: { name: string; country: string; region: string };
  candidates: DistilleryCandidate[];
};

export type DistilleryChoice = { distilleryId: string } | { create: { name: string; country: string; region: string } };

export type FieldChange = { field: string; from: string | null; to: string | null };

export type PlanStatus = "new" | "update" | "unchanged";

export type GatheringPlan = {
  number: number;
  status: PlanStatus;
  gatheringId: string | null;
  date: string | null;
  theme: string | null;
  host: string | null;
  hostMemberId: string | null; // null: host is created as a new member
  changes: FieldChange[];
};

export type WhiskyPlan = {
  row: number;
  gathering: number;
  status: PlanStatus;
  whiskyId: string | null;
  distilleryKey: string;
  distillery: string; // display name the row resolves to
  provider: string | null;
  variety: string | null;
  abv: string | null;
  ranking: number | null;
  notes: string | null;
  changes: FieldChange[];
};

export type ImportPlan = {
  distilleries: DistilleryMatch[];
  gatherings: GatheringPlan[];
  whiskies: WhiskyPlan[];
  newMembers: string[];
  notInSheet: { gathering: number; distillery: string; variety: string; provider: string }[];
  warnings: string[];
  aiUsed: boolean;
  previousHostIds: Map<number, string>; // gathering number → current host, for recounting hosting stats
  summary: {
    newWhiskies: number;
    updatedWhiskies: number;
    unchangedWhiskies: number;
    newGatherings: number;
    updatedGatherings: number;
    newDistilleries: number;
    skippedRows: number;
  };
};

export const distilleryKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

type DistilleryRow = { id: string; name: string; country: string; region: string };

// Accept a deterministic match at or above this fuzzy score without asking the AI
const AUTO_FUZZY = 0.92;
// Without AI, fall back to the best fuzzy candidate at or above this score
const FALLBACK_FUZZY = 0.8;

function containsWords(haystack: string, needle: string): boolean {
  const h = ` ${normalizeForMatch(haystack)} `;
  const n = normalizeForMatch(needle);
  return n.length >= 3 && h.includes(` ${n} `);
}

function looseCountry(country: string): string {
  const c = country.trim().toLowerCase();
  const aliases: Record<string, string> = {
    irish: "ireland", japanese: "japan", australian: "australia", dutch: "netherlands",
    welsh: "wales", english: "england", scottish: "scotland", "united states": "usa",
  };
  return aliases[c] ?? c;
}

function rankCandidates(name: string, country: string, all: DistilleryRow[]): DistilleryCandidate[] {
  const sheetCountry = looseCountry(country);
  return all
    .map((d) => {
      let score = diceCoefficient(name, d.name);
      // "Whitlaw (Highland Park)" → Highland Park; "The Glasgow Distillery" ↔ "Glasgow"
      if (containsWords(name, d.name) || containsWords(d.name, name)) score = Math.max(score, 0.85);
      if (sheetCountry && looseCountry(d.country) === sheetCountry) score += 0.03;
      return { id: d.id, name: d.name, country: d.country, region: d.region, score: Math.min(1, score) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

type AiVerdict = {
  candidateId: string | null;
  confidence: number;
  reason: string;
  canonical: { name: string; country: string; region: string } | null;
};

// Ask the model to pick a candidate (or none) for each unresolved sheet name. Throws if AI fails.
async function aiMatchDistilleries(
  env: Env,
  items: DistilleryMatch[],
  vocabulary: { countries: string[]; regions: string[] },
): Promise<Map<string, AiVerdict>> {
  const verdicts = new Map<string, AiVerdict>();
  const system = `You match distillery names typed into a whisky club's tasting spreadsheet to distilleries already in the club's database.
Names are typed by hand: expect typos, missing or extra spaces, a "The" prefix, a bottling or brand name instead of the distillery (e.g. "Whitlaw (Highland Park)" is Highland Park), and independent bottlers.
Pick a candidate only if it is the same producer. If none is, return null and give the canonical name, country and region to create it with.
Countries already used on the site: ${vocabulary.countries.join(", ")}. Regions already used: ${vocabulary.regions.join(", ")}. Reuse these spellings (use the country name, e.g. "Ireland" not "Irish"; for Scotland use Highland, Speyside, Islay, Lowland, Campbeltown or Island).
Reply with JSON only: {"matches":[{"ref":"n1","candidate":"c2" or null,"confidence":0.0-1.0,"reason":"short reason","name":"canonical distillery name","country":"...","region":"..."}]}`;

  for (const group of chunk(items, 10)) {
    const payload = group.map((item, i) => ({
      ref: `n${i + 1}`,
      name: item.sheetName,
      country: item.sheetCountry,
      region: item.sheetRegion,
      candidates: item.candidates.map((c, j) => ({ id: `c${j + 1}`, name: c.name, country: c.country, region: c.region })),
    }));
    const text = await complete(env, [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify({ names: payload }) },
    ], true, 2048);
    const parsed = JSON.parse(text) as { matches?: unknown };
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    for (const raw of matches) {
      const m = raw as Record<string, unknown>;
      const index = parseInt(String(m.ref ?? "").replace(/^n/, "")) - 1;
      const item = group[index];
      if (!item) continue;
      const candidateIndex = typeof m.candidate === "string" ? parseInt(m.candidate.replace(/^c/, "")) - 1 : -1;
      const candidate = item.candidates[candidateIndex];
      const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : fallback);
      verdicts.set(item.key, {
        candidateId: candidate?.id ?? null,
        confidence: typeof m.confidence === "number" ? Math.max(0, Math.min(1, m.confidence)) : 0.5,
        reason: str(m.reason, ""),
        canonical: {
          name: str(m.name, item.sheetName),
          country: str(m.country, item.sheetCountry),
          region: str(m.region, item.sheetRegion),
        },
      });
    }
  }
  return verdicts;
}

function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  for (const [v, n] of counts) if (best === null || n > counts.get(best)!) best = v;
  return best;
}

// A stored date matches a sheet day if it is that day in UTC or UK time (older imports used local midnight)
function sameDay(date: Date, ymd: string): boolean {
  if (date.toISOString().slice(0, 10) === ymd) return true;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date) === ymd;
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatAbv(abv: number): string {
  return String(Math.round(abv * 100) / 100);
}

function sameAbv(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(parseFloat(a) - parseFloat(b)) < 0.05;
}

const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export async function planImport(
  db: Db,
  env: Env,
  rows: DramsSheetRow[],
  options: { useAi: boolean; choices?: Record<string, DistilleryChoice> },
): Promise<ImportPlan> {
  const warnings: string[] = [];

  // Rows with no distillery are placeholders for upcoming gatherings (provider assigned, dram not yet known)
  const dramRows = rows.filter((r) => r.distillery);
  const skippedRows = rows.length - dramRows.length;
  if (skippedRows > 0) {
    const numbers = [...new Set(rows.filter((r) => !r.distillery).map((r) => r.gathering))];
    warnings.push(`Skipped ${skippedRows} row${skippedRows === 1 ? "" : "s"} with no distillery (gathering ${numbers.join(", ")}).`);
  }

  const [allDistilleries, allMembers, allGatherings, allWhiskies] = await Promise.all([
    db.select({ id: distilleries.id, name: distilleries.name, country: distilleries.country, region: distilleries.region }).from(distilleries),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select().from(gatherings),
    db.select({
      id: whiskies.id,
      gatheringId: whiskies.gatheringId,
      distilleryId: whiskies.distilleryId,
      provider: whiskies.provider,
      variety: whiskies.variety,
      abv: whiskies.abv,
      notes: whiskies.notes,
      ranking: whiskies.ranking,
    }).from(whiskies),
  ]);
  const distilleryById = new Map(allDistilleries.map((d) => [d.id, d]));

  // --- Distilleries: one match per distinct sheet spelling ---
  const matches = new Map<string, DistilleryMatch>();
  for (const row of dramRows) {
    const key = distilleryKey(row.distillery!);
    const existing = matches.get(key);
    if (existing) {
      existing.rowCount++;
      continue;
    }
    matches.set(key, {
      key,
      sheetName: row.distillery!.trim(),
      sheetCountry: row.country ?? "",
      sheetRegion: row.region ?? "",
      rowCount: 1,
      method: "new",
      distilleryId: null,
      matchedName: null,
      confidence: 0,
      reason: null,
      create: { name: row.distillery!.trim(), country: row.country ?? "", region: row.region ?? "" },
      candidates: [],
    });
  }

  const needsAi: DistilleryMatch[] = [];
  for (const match of matches.values()) {
    match.candidates = rankCandidates(match.sheetName, match.sheetCountry, allDistilleries);
    const choice = options.choices?.[match.key];
    if (choice) {
      if ("distilleryId" in choice) {
        const chosen = distilleryById.get(choice.distilleryId);
        if (!chosen) throw new Error(`Distillery chosen for "${match.sheetName}" no longer exists`);
        Object.assign(match, { method: "manual", distilleryId: chosen.id, matchedName: chosen.name, confidence: 1 });
      } else {
        Object.assign(match, { method: "manual", create: choice.create, confidence: 1 });
      }
      continue;
    }

    const exact = allDistilleries.find((d) => distilleryKey(d.name) === match.key);
    const normalised = exact ?? allDistilleries.find((d) =>
      normalizeForMatch(d.name) === normalizeForMatch(match.sheetName) ||
      tokenSignature(d.name) === tokenSignature(match.sheetName));
    const best = match.candidates[0];
    if (normalised) {
      Object.assign(match, { method: exact ? "exact" : "fuzzy", distilleryId: normalised.id, matchedName: normalised.name, confidence: exact ? 1 : 0.97 });
    } else if (best && best.score >= AUTO_FUZZY) {
      Object.assign(match, { method: "fuzzy", distilleryId: best.id, matchedName: best.name, confidence: best.score });
    } else {
      needsAi.push(match);
    }
  }

  let aiUsed = false;
  let verdicts = new Map<string, AiVerdict>();
  if (needsAi.length > 0 && options.useAi) {
    const countries = [...new Set(allDistilleries.map((d) => d.country).filter(Boolean))].sort();
    const regions = [...new Set(allDistilleries.map((d) => d.region).filter(Boolean))].sort();
    try {
      verdicts = await aiMatchDistilleries(env, needsAi, { countries, regions });
      aiUsed = true;
    } catch (error) {
      console.error("AI distillery matching failed:", error);
      warnings.push("AI matching is unavailable, so uncertain distillery names were matched by spelling only. Check them below.");
    }
  }
  for (const match of needsAi) {
    const verdict = verdicts.get(match.key);
    const best = match.candidates[0];
    if (verdict?.candidateId) {
      const chosen = distilleryById.get(verdict.candidateId)!;
      Object.assign(match, { method: "ai", distilleryId: chosen.id, matchedName: chosen.name, confidence: verdict.confidence, reason: verdict.reason });
    } else if (verdict) {
      Object.assign(match, { method: "new", confidence: verdict.confidence, reason: verdict.reason, create: verdict.canonical ?? match.create });
    } else if (best && best.score >= FALLBACK_FUZZY) {
      Object.assign(match, { method: "fuzzy", distilleryId: best.id, matchedName: best.name, confidence: best.score });
    }
  }

  // --- Members (hosts): exact name, else a close spelling ("Adrain" → "Adrian"), else new ---
  const memberByKey = new Map(allMembers.map((m) => [m.name.trim().toLowerCase(), m]));
  const newMembers = new Set<string>();
  const resolveHost = (name: string | null): { id: string | null; name: string | null } => {
    if (!name) return { id: null, name: null };
    const hit = memberByKey.get(name.toLowerCase());
    if (hit) return { id: hit.id, name: hit.name };
    let best: { id: string; name: string; score: number } | null = null;
    for (const m of allMembers) {
      // Same letters in a different order ("Adrain") counts as a near-certain match
      const anagram = [...name.toLowerCase()].sort().join("") === [...m.name.toLowerCase()].sort().join("");
      const score = anagram ? 0.95 : diceCoefficient(name, m.name);
      if (score >= 0.6 && (!best || score > best.score)) best = { id: m.id, name: m.name, score };
    }
    if (best && best.name[0].toLowerCase() === name[0].toLowerCase()) {
      warnings.push(`Host "${name}" matched to member "${best.name}".`);
      memberByKey.set(name.toLowerCase(), { id: best.id, name: best.name });
      return { id: best.id, name: best.name };
    }
    newMembers.add(name);
    return { id: null, name };
  };

  // --- Gatherings ---
  const rowsByGathering = new Map<number, DramsSheetRow[]>();
  for (const row of dramRows) {
    rowsByGathering.set(row.gathering, [...(rowsByGathering.get(row.gathering) ?? []), row]);
  }
  const gatheringByNumber = new Map(allGatherings.map((g) => [g.number, g]));
  const memberNameById = new Map(allMembers.map((m) => [m.id, m.name]));
  const gatheringPlans: GatheringPlan[] = [];

  for (const [number, gRows] of [...rowsByGathering].sort((a, b) => a[0] - b[0])) {
    const dates = [...new Set(gRows.map((r) => r.date).filter(Boolean))];
    const hosts = [...new Set(gRows.map((r) => r.host).filter(Boolean))];
    if (dates.length > 1) warnings.push(`Gathering ${number} has ${dates.length} different dates in the sheet (${dates.join(", ")}); using the most common.`);
    if (hosts.length > 1) warnings.push(`Gathering ${number} has ${hosts.length} different hosts in the sheet (${hosts.join(", ")}); using the most common.`);
    // "Bonus" marks a bonus dram, not the gathering's theme
    const theme = mostCommon(gRows.map((r) => (r.theme && r.theme.toLowerCase() !== "bonus" ? r.theme : null)));
    const date = mostCommon(gRows.map((r) => r.date));
    const existing = gatheringByNumber.get(number);
    // Leave the host alone if one of the sheet's spellings for it is the current host
    const currentHost = existing ? memberNameById.get(existing.hostId) ?? null : null;
    const sheetHasCurrentHost = existing !== undefined && hosts.some((h) => sameText(h, currentHost));
    const host = sheetHasCurrentHost
      ? { id: existing!.hostId, name: currentHost }
      : resolveHost(mostCommon(gRows.map((r) => r.host)));

    if (!existing) {
      if (!date || !host.name) {
        warnings.push(`Gathering ${number} is new but has no ${!date ? "date" : "host"}; its rows are skipped.`);
        continue;
      }
      gatheringPlans.push({ number, status: "new", gatheringId: null, date, theme, host: host.name, hostMemberId: host.id, changes: [] });
      continue;
    }
    const changes: FieldChange[] = [];
    if (date && !sameDay(existing.date, date)) changes.push({ field: "date", from: existing.date.toISOString().slice(0, 10), to: date });
    if (theme && !sameText(theme, existing.theme)) changes.push({ field: "theme", from: existing.theme, to: theme });
    if (host.name && host.id !== existing.hostId) changes.push({ field: "host", from: currentHost, to: host.name });
    gatheringPlans.push({
      number,
      status: changes.length ? "update" : "unchanged",
      gatheringId: existing.id,
      date,
      theme,
      host: host.name,
      hostMemberId: host.id,
      changes,
    });
  }
  const plannedGatherings = new Map(gatheringPlans.map((g) => [g.number, g]));

  // --- Whiskies: match within each gathering ---
  const whiskiesByGatheringId = new Map<string, typeof allWhiskies>();
  for (const w of allWhiskies) {
    whiskiesByGatheringId.set(w.gatheringId, [...(whiskiesByGatheringId.get(w.gatheringId) ?? []), w]);
  }
  const whiskyPlans: WhiskyPlan[] = [];
  const notInSheet: ImportPlan["notInSheet"] = [];

  for (const [number, gRows] of rowsByGathering) {
    const gathering = plannedGatherings.get(number);
    if (!gathering) continue;
    const existingInGathering = gathering.gatheringId ? whiskiesByGatheringId.get(gathering.gatheringId) ?? [] : [];
    const claimed = new Set<string>();
    const resolved = gRows.map((row) => {
      const match = matches.get(distilleryKey(row.distillery!))!;
      return { row, match, distilleryId: match.distilleryId };
    });
    const pick = (list: typeof existingInGathering) => list.filter((w) => !claimed.has(w.id));
    const target = new Map<number, (typeof existingInGathering)[number]>();
    // Pass 1: same distillery, variety and provider (a gathering can have the same dram twice); pass 2: same
    // distillery and variety; pass 3: same distillery (if unambiguous); pass 4: same provider (if unambiguous)
    for (const withProvider of [true, false]) {
      for (const { row, distilleryId } of resolved) {
        if (target.has(row.row) || !distilleryId) continue;
        const hit = pick(existingInGathering).find((w) =>
          w.distilleryId === distilleryId && sameText(w.variety, row.variety) && (!withProvider || sameText(w.provider, row.provider)));
        if (hit) { claimed.add(hit.id); target.set(row.row, hit); }
      }
    }
    for (const { row, distilleryId } of resolved) {
      if (target.has(row.row) || !distilleryId) continue;
      const free = pick(existingInGathering).filter((w) => w.distilleryId === distilleryId);
      const sheetSame = resolved.filter((r) => !target.has(r.row.row) && r.distilleryId === distilleryId);
      if (free.length === 1 && sheetSame.length === 1) { claimed.add(free[0].id); target.set(row.row, free[0]); }
    }
    for (const { row } of resolved) {
      if (target.has(row.row) || !row.provider) continue;
      const free = pick(existingInGathering).filter((w) => sameText(w.provider, row.provider));
      const sheetSame = resolved.filter((r) => !target.has(r.row.row) && sameText(r.row.provider, row.provider));
      if (free.length === 1 && sheetSame.length === 1) { claimed.add(free[0].id); target.set(row.row, free[0]); }
    }

    const rankCounts = new Map<number, number>();
    for (const { row, match, distilleryId } of resolved) {
      const ranking = parseRanking(row.notes);
      if (ranking !== null) rankCounts.set(ranking, (rankCounts.get(ranking) ?? 0) + 1);
      const abv = row.abv !== null ? formatAbv(row.abv) : null;
      const displayName = match.matchedName ?? match.create.name;
      const existing = target.get(row.row);
      if (!existing) {
        if (!row.provider) warnings.push(`Row ${row.row} (gathering ${number}, ${row.distillery}) has no provider.`);
        whiskyPlans.push({
          row: row.row, gathering: number, status: "new", whiskyId: null, distilleryKey: match.key, distillery: displayName,
          provider: row.provider, variety: row.variety, abv, ranking, notes: row.notes, changes: [],
        });
        continue;
      }
      const changes: FieldChange[] = [];
      if (distilleryId !== existing.distilleryId) {
        changes.push({ field: "distillery", from: distilleryById.get(existing.distilleryId)?.name ?? null, to: displayName });
      }
      if (row.provider && !sameText(row.provider, existing.provider)) changes.push({ field: "provider", from: existing.provider, to: row.provider });
      if (row.variety && row.variety.trim() !== existing.variety.trim()) changes.push({ field: "variety", from: existing.variety, to: row.variety });
      if (abv && !sameAbv(abv, existing.abv)) changes.push({ field: "abv", from: existing.abv, to: abv });
      if (ranking !== null && ranking !== existing.ranking) changes.push({ field: "ranking", from: existing.ranking?.toString() ?? null, to: String(ranking) });
      if (row.notes && !sameText(row.notes, existing.notes)) changes.push({ field: "notes", from: existing.notes, to: row.notes });
      whiskyPlans.push({
        row: row.row, gathering: number, status: changes.length ? "update" : "unchanged", whiskyId: existing.id,
        distilleryKey: match.key, distillery: displayName, provider: row.provider, variety: row.variety, abv, ranking,
        notes: row.notes, changes,
      });
    }
    for (const [rank, n] of rankCounts) {
      if (n > 1) warnings.push(`Gathering ${number}: ${n} drams are ranked ${rank}.`);
    }
    for (const w of existingInGathering) {
      if (!claimed.has(w.id)) {
        notInSheet.push({ gathering: number, distillery: distilleryById.get(w.distilleryId)?.name ?? "?", variety: w.variety, provider: w.provider });
      }
    }
  }
  whiskyPlans.sort((a, b) => a.row - b.row);

  const distilleryList = [...matches.values()].sort((a, b) => {
    const order: Record<MatchMethod, number> = { new: 0, ai: 1, fuzzy: 2, manual: 3, exact: 4 };
    return order[a.method] - order[b.method] || a.sheetName.localeCompare(b.sheetName);
  });

  return {
    distilleries: distilleryList,
    gatherings: gatheringPlans,
    whiskies: whiskyPlans,
    newMembers: [...newMembers],
    notInSheet,
    warnings,
    aiUsed,
    previousHostIds: new Map(allGatherings.map((g) => [g.number, g.hostId])),
    summary: {
      newWhiskies: whiskyPlans.filter((w) => w.status === "new").length,
      updatedWhiskies: whiskyPlans.filter((w) => w.status === "update").length,
      unchangedWhiskies: whiskyPlans.filter((w) => w.status === "unchanged").length,
      newGatherings: gatheringPlans.filter((g) => g.status === "new").length,
      updatedGatherings: gatheringPlans.filter((g) => g.status === "update").length,
      newDistilleries: distilleryList.filter((d) => !d.distilleryId).length,
      skippedRows,
    },
  };
}

/** Re-plan with the admin's distillery choices (no AI) and write the result. */
export async function applyImport(
  db: Db,
  env: Env,
  rows: DramsSheetRow[],
  choices: Record<string, DistilleryChoice>,
): Promise<ImportPlan["summary"]> {
  const plan = await planImport(db, env, rows, { useAi: false, choices });
  const now = new Date();
  // Written in dependency order: inserts (distilleries, members, gatherings, whiskies), then updates
  const inserts: BatchItem<"sqlite">[] = [];
  const updates: BatchItem<"sqlite">[] = [];
  const affectedHosts = new Set<string>();

  // New distilleries (two sheet spellings may resolve to the same new name)
  const newDistilleryIds = new Map<string, string>(); // match key → id
  const createdByName = new Map<string, string>(); // lower-cased name → id
  const newDistilleryRows: (typeof distilleries.$inferInsert)[] = [];
  for (const match of plan.distilleries) {
    if (match.distilleryId) continue;
    const name = match.create.name.trim();
    if (!name) throw new Error(`New distillery for "${match.sheetName}" needs a name`);
    const nameKey = name.toLowerCase();
    let id = createdByName.get(nameKey);
    if (!id) {
      id = crypto.randomUUID();
      createdByName.set(nameKey, id);
      newDistilleryRows.push({
        id,
        name,
        country: match.create.country.trim(),
        region: match.create.region.trim(),
        coordinates: getDistilleryCoordinates(name) ?? undefined,
      });
    }
    newDistilleryIds.set(match.key, id);
  }
  const distilleryIdFor = (key: string) => {
    const match = plan.distilleries.find((d) => d.key === key)!;
    return match.distilleryId ?? newDistilleryIds.get(key)!;
  };
  for (const batch of chunk(newDistilleryRows, maxInsertRows(distilleries))) {
    inserts.push(db.insert(distilleries).values(batch));
  }

  // New members (hosts)
  const memberIds = new Map<string, string>();
  const newMemberRows = plan.newMembers.map((name) => {
    const id = crypto.randomUUID();
    memberIds.set(name, id);
    return { id, name };
  });
  for (const batch of chunk(newMemberRows, maxInsertRows(members))) {
    inserts.push(db.insert(members).values(batch));
  }
  const hostIdFor = (g: GatheringPlan) => g.hostMemberId ?? memberIds.get(g.host!)!;

  // Gatherings
  const gatheringIds = new Map<number, string>();
  const newGatheringRows: (typeof gatherings.$inferInsert)[] = [];
  for (const g of plan.gatherings) {
    if (g.status === "new") {
      const id = crypto.randomUUID();
      gatheringIds.set(g.number, id);
      const date = ymdToDate(g.date!);
      newGatheringRows.push({ id, number: g.number, date, hostId: hostIdFor(g), theme: g.theme ?? undefined });
      affectedHosts.add(hostIdFor(g));
      continue;
    }
    gatheringIds.set(g.number, g.gatheringId!);
    if (g.status === "update") {
      const set: Partial<typeof gatherings.$inferInsert> = { updatedAt: now };
      for (const change of g.changes) {
        if (change.field === "date") set.date = ymdToDate(change.to!);
        if (change.field === "theme") set.theme = change.to;
        if (change.field === "host") set.hostId = hostIdFor(g);
        if (change.field === "host" || change.field === "date") {
          affectedHosts.add(hostIdFor(g));
          const previous = plan.previousHostIds.get(g.number);
          if (previous) affectedHosts.add(previous);
        }
      }
      updates.push(db.update(gatherings).set(set).where(eq(gatherings.id, g.gatheringId!)));
    }
  }
  for (const batch of chunk(newGatheringRows, maxInsertRows(gatherings))) {
    inserts.push(db.insert(gatherings).values(batch));
  }

  // Whiskies
  const newWhiskyRows: (typeof whiskies.$inferInsert)[] = [];
  const whiskyUpdates: BatchItem<"sqlite">[] = [];
  for (const w of plan.whiskies) {
    if (w.status === "new") {
      newWhiskyRows.push({
        id: crypto.randomUUID(),
        gatheringId: gatheringIds.get(w.gathering)!,
        distilleryId: distilleryIdFor(w.distilleryKey),
        provider: w.provider ?? "",
        variety: w.variety ?? "",
        abv: w.abv ?? "0",
        notes: w.notes,
        ranking: w.ranking,
      });
    } else if (w.status === "update") {
      const set: Partial<typeof whiskies.$inferInsert> = { updatedAt: now };
      for (const change of w.changes) {
        if (change.field === "distillery") set.distilleryId = distilleryIdFor(w.distilleryKey);
        if (change.field === "provider") set.provider = change.to!;
        if (change.field === "variety") set.variety = change.to!;
        if (change.field === "abv") set.abv = change.to!;
        if (change.field === "ranking") set.ranking = Number(change.to);
        if (change.field === "notes") set.notes = change.to;
      }
      whiskyUpdates.push(db.update(whiskies).set(set).where(eq(whiskies.id, w.whiskyId!)));
    }
  }

  for (const batch of chunk(newWhiskyRows, maxInsertRows(whiskies))) {
    inserts.push(db.insert(whiskies).values(batch));
  }

  // Hosting stats are derived from the gatherings, so recount them for every host touched
  for (const memberId of affectedHosts) {
    updates.push(
      db.update(members)
        .set({
          timesHosted: sql`(SELECT count(*) FROM ${gatherings} WHERE ${gatherings.hostId} = ${memberId})`,
          lastHosted: sql`(SELECT max(${gatherings.date}) FROM ${gatherings} WHERE ${gatherings.hostId} = ${memberId})`,
          updatedAt: now,
        })
        .where(eq(members.id, memberId)),
    );
  }

  const ordered = [...inserts, ...updates, ...whiskyUpdates];
  if (ordered.length > 0) await runBatched(db, ordered);
  return { ...plan.summary, newDistilleries: newDistilleryRows.length };
}
