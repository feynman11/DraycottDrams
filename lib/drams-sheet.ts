/**
 * The club chair's "Drams" spreadsheet: one row per dram, columns
 * Gathering, Theme, Date, Provider, Country, Region, Distillery, Variety, ABV, Host, Notes.
 * Notes holds the finishing position ("First" … "Sixth"); bonus drams have none.
 *
 * Parsing happens in the browser (the page reads the workbook with xlsx); the Worker
 * re-validates the rows with `dramsSheetRowSchema`.
 */
import { z } from "zod";

export const DRAMS_COLUMNS = [
  "Gathering",
  "Theme",
  "Date",
  "Provider",
  "Country",
  "Region",
  "Distillery",
  "Variety",
  "ABV",
  "Host",
  "Notes",
] as const;

export const dramsSheetRowSchema = z.object({
  row: z.number().int(), // spreadsheet row number (the header is row 1)
  gathering: z.number().int().positive(),
  theme: z.string().max(200).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), // yyyy-mm-dd
  provider: z.string().max(100).nullable(),
  country: z.string().max(100).nullable(),
  region: z.string().max(100).nullable(),
  distillery: z.string().max(200).nullable(),
  variety: z.string().max(200).nullable(),
  abv: z.number().min(0).max(100).nullable(), // percent
  host: z.string().max(100).nullable(),
  notes: z.string().max(500).nullable(),
});

export type DramsSheetRow = z.infer<typeof dramsSheetRowSchema>;

const RANK_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};

// "First" / "third" / "1st" / "1" → 1..10; anything else (bonus drams, free text) → null
export function parseRanking(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const normalized = notes.toLowerCase().trim();
  if (RANK_WORDS[normalized]) return RANK_WORDS[normalized];
  const numeric = normalized.match(/^(\d{1,2})(st|nd|rd|th)?$/);
  if (numeric) {
    const n = parseInt(numeric[1]);
    return n >= 1 && n <= 10 ? n : null;
  }
  return null;
}

export function rankingLabel(ranking: number | null): string | null {
  if (ranking === null) return null;
  const word = Object.keys(RANK_WORDS).find((k) => RANK_WORDS[k] === ranking);
  return word ? word[0].toUpperCase() + word.slice(1) : String(ranking);
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

// Excel stores dates as serial day numbers (1900 system); strings are parsed as a fallback.
function parseDateCell(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = text(value);
  if (!s) return null;
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())).toISOString().slice(0, 10);
}

// 0.46 (Excel percentage format), 46, "46%", "46.0" → 46
export function parseAbvCell(value: unknown): number | null {
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else {
    const s = text(value);
    if (!s) return null;
    n = parseFloat(s.replace("%", ""));
  }
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 1) n *= 100;
  return Math.round(n * 100) / 100;
}

/**
 * Turn the records of a sheet (xlsx `sheet_to_json(sheet, { defval: null })`) into rows.
 * Headers are matched case-insensitively; rows without a gathering number are dropped.
 */
export function readDramsRecords(records: Record<string, unknown>[]): { rows: DramsSheetRow[]; errors: string[] } {
  const errors: string[] = [];
  if (records.length === 0) return { rows: [], errors: ["The sheet has no rows"] };

  const headers = Object.keys(records[0]);
  const column = (name: string) => headers.find((h) => h.trim().toLowerCase() === name.toLowerCase());
  const missing = DRAMS_COLUMNS.filter((c) => !column(c) && c !== "Notes" && c !== "Theme");
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`] };
  }
  const get = (record: Record<string, unknown>, name: string) => {
    const key = column(name);
    return key ? record[key] : null;
  };

  const rows: DramsSheetRow[] = [];
  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const gatheringRaw = get(record, "Gathering");
    if (gatheringRaw === null || gatheringRaw === undefined || String(gatheringRaw).trim() === "") return;
    const gathering = Number(gatheringRaw);
    if (!Number.isInteger(gathering) || gathering < 1) {
      errors.push(`Row ${rowNumber}: gathering "${gatheringRaw}" is not a number`);
      return;
    }
    rows.push({
      row: rowNumber,
      gathering,
      theme: text(get(record, "Theme")),
      date: parseDateCell(get(record, "Date")),
      provider: text(get(record, "Provider")),
      country: text(get(record, "Country")),
      region: text(get(record, "Region")),
      distillery: text(get(record, "Distillery")),
      variety: text(get(record, "Variety")),
      abv: parseAbvCell(get(record, "ABV")),
      host: text(get(record, "Host")),
      notes: text(get(record, "Notes")),
    });
  });
  return { rows, errors };
}

// The sheet to read from a workbook: "Drams" if present, else the first with the expected headers.
export function pickDramsSheet(sheetNames: string[], headersOf: (name: string) => string[]): string | null {
  const byName = sheetNames.find((n) => n.trim().toLowerCase() === "drams");
  if (byName) return byName;
  return (
    sheetNames.find((n) => {
      const headers = headersOf(n).map((h) => h.trim().toLowerCase());
      return headers.includes("gathering") && headers.includes("distillery");
    }) ?? null
  );
}
