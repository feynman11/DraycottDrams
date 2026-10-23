import { createTRPCRouter, memberProcedure } from "@/worker/trpc";
import type { Db } from "@/worker/db";
import { whiskies, distilleries, gatherings, members } from "@/db/schema";
import { parseCSV, generateCSVTemplate } from "@/lib/csv-parser";
import { getDistilleryCoordinates } from "@/lib/distillery-coordinates";
import { z } from "zod";
import { eq, sql, getTableColumns, type Table } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import * as XLSX from "xlsx";

// D1 allows at most 100 bound parameters per statement: rows per multi-row insert into `table`
function maxInsertRows(table: Table): number {
  return Math.floor(100 / Object.keys(getTableColumns(table)).length);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Run write statements in order via db.batch (D1 has no interactive transactions). Each batch
// of up to 50 statements is atomic; an import larger than that is applied as several batches.
async function runBatched(db: Db, statements: BatchItem<"sqlite">[]): Promise<void> {
  for (const group of chunk(statements, 50)) {
    await db.batch(group as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  }
}

// Load all members once, keyed by lower-cased name (replaces a case-insensitive lookup per host)
async function loadMemberIdsByName(db: Db): Promise<Map<string, string>> {
  const memberIds = new Map<string, string>();
  for (const member of await db.select({ id: members.id, name: members.name }).from(members)) {
    const key = member.name.toLowerCase();
    if (!memberIds.has(key)) memberIds.set(key, member.id);
  }
  return memberIds;
}

// Load all gathering IDs once, keyed by gathering number
async function loadGatheringIdsByNumber(db: Db): Promise<Map<number, string>> {
  const gatheringIds = new Map<number, string>();
  for (const gathering of await db.select({ id: gatherings.id, number: gatherings.number }).from(gatherings)) {
    gatheringIds.set(gathering.number, gathering.id);
  }
  return gatheringIds;
}

type DistilleryRow = { id: string; name: string; country: string; region: string; coordinates: [number, number] | null };

async function loadDistilleries(db: Db): Promise<DistilleryRow[]> {
  return db
    .select({
      id: distilleries.id,
      name: distilleries.name,
      country: distilleries.country,
      region: distilleries.region,
      coordinates: distilleries.coordinates,
    })
    .from(distilleries);
}

// Helper function to parse date strings like "15 November 2019"
function parseDate(dateStr: string): Date {
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  
  const parts = dateStr.toLowerCase().trim().split(' ');
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

// Helper function to parse ABV percentage strings like "46.0%" to number
function parseABV(abvStr: string): number {
  return parseFloat(abvStr.replace('%', '').trim());
}

// Helper function to parse ranking text to number (First -> 1, Second -> 2, etc.)
function parseRanking(notes: string | undefined | null): number | null {
  if (!notes) return null;

  const rankingMap: Record<string, number> = {
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8,
    'ninth': 9,
    'tenth': 10,
  };

  const normalized = notes.toLowerCase().trim();
  return rankingMap[normalized] || null;
}

// Helper function to calculate string similarity (Levenshtein distance based)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Create matrix
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - (matrix[len1][len2] / maxLen);
}

// Find best matching distillery with fuzzy matching, among `allDistilleries` (loaded once per import)
function findMatchingDistillery(
  allDistilleries: DistilleryRow[],
  name: string,
  country: string,
  region: string,
  threshold: number = 0.8
): { id: string; name: string; score: number } | null {
  // First, try exact match (case-insensitive)
  const exactMatch = allDistilleries.find(
    (dist) => dist.name.toLowerCase() === name.trim().toLowerCase()
  );

  if (exactMatch) {
    return { id: exactMatch.id, name: exactMatch.name, score: 1 };
  }

  // If no exact match, try fuzzy matching

  let bestMatch: { id: string; name: string; score: number } | null = null;

  for (const dist of allDistilleries) {
    // Calculate similarity
    let score = stringSimilarity(name, dist.name);

    // Boost score if country/region matches
    if (country && dist.country?.toLowerCase() === country.toLowerCase()) {
      score += 0.05;
    }
    if (region && dist.region?.toLowerCase() === region.toLowerCase()) {
      score += 0.05;
    }

    // Cap at 1
    score = Math.min(score, 1);

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: dist.id, name: dist.name, score };
    }
  }

  return bestMatch;
}

export const importRouter = createTRPCRouter({
  // Get CSV template
  getTemplate: memberProcedure.query(() => {
    return {
      csv: generateCSVTemplate(),
    };
  }),

  // Import CSV data
  importCSV: memberProcedure
    .input(
      z.object({
        csvText: z.string().min(1),
        clearExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { csvText, clearExisting } = input;
      
      // Parse CSV
      const parsed = parseCSV(csvText);
      
      if (parsed.errors.length > 0) {
        return {
          success: false,
          errors: parsed.errors,
          imported: 0,
        };
      }

      if (parsed.data.length === 0) {
        return {
          success: false,
          errors: ['No valid data rows found'],
          imported: 0,
        };
      }

      try {
        // Writes are collected here and run in order at the end via db.batch
        const statements: BatchItem<"sqlite">[] = [];

        // Clear existing data if requested
        if (clearExisting) {
          statements.push(ctx.db.delete(whiskies));
        }

        // Create a map of member names to their IDs (existing members loaded in one query)
        const memberMap = await loadMemberIdsByName(ctx.db);
        const newMembers: { id: string; name: string }[] = [];
        
        // Get unique host names from CSV
        const hostNames = new Set<string>();
        for (const whisky of parsed.data) {
          hostNames.add(whisky.host.trim());
        }

        // Get or create members for each host
        for (const hostName of hostNames) {
          const normalizedName = hostName.toLowerCase().trim();
          
          // Check if member exists (case-insensitive)
          if (!memberMap.has(normalizedName)) {
            // Create new member
            const id = crypto.randomUUID();
            newMembers.push({ id, name: hostName });
            memberMap.set(normalizedName, id);
          }
        }
        for (const rows of chunk(newMembers, maxInsertRows(members))) {
          statements.push(ctx.db.insert(members).values(rows));
        }

        // Create a map of gathering numbers to their IDs
        const gatheringMap = new Map<number, { id: string; number: number; date: Date; hostId: string; theme: string | null }>();
        
        // Group by gathering number
        for (const whisky of parsed.data) {
          if (!gatheringMap.has(whisky.gathering)) {
            const hostKey = whisky.host.toLowerCase().trim();
            const hostId = memberMap.get(hostKey);
            
            if (!hostId) {
              throw new Error(`Member ID not found for host: ${whisky.host}`);
            }

            gatheringMap.set(whisky.gathering, {
              id: '',
              number: whisky.gathering,
              date: parseDate(whisky.date),
              hostId: hostId,
              theme: whisky.theme?.trim() || null,
            });
          }
        }

        // Check existing gatherings and create missing ones
        const existingGatheringIds = await loadGatheringIdsByNumber(ctx.db);
        const gatheringIdMap = new Map<number, string>();
        const newGatherings: { id: string; number: number; date: Date; hostId: string; theme: string | undefined }[] = [];
        const hostStatUpdates: BatchItem<"sqlite">[] = [];
        
        for (const [number, gatheringData] of gatheringMap.entries()) {
          // Check if gathering exists by number
          const existingId = existingGatheringIds.get(number);

          if (existingId) {
            // Use existing gathering
            gatheringIdMap.set(number, existingId);
          } else {
            // Create new gathering
            const id = crypto.randomUUID();
            newGatherings.push({
              id,
              number: gatheringData.number,
              date: gatheringData.date,
              hostId: gatheringData.hostId,
              theme: gatheringData.theme || undefined,
            });
            
            gatheringIdMap.set(number, id);

            // Update member hosting stats
            hostStatUpdates.push(
              ctx.db
                .update(members)
                .set({
                  timesHosted: sql`${members.timesHosted} + 1`,
                  lastHosted: gatheringData.date,
                  updatedAt: new Date(),
                })
                .where(eq(members.id, gatheringData.hostId))
            );
          }
        }
        for (const rows of chunk(newGatherings, maxInsertRows(gatherings))) {
          statements.push(ctx.db.insert(gatherings).values(rows));
        }
        statements.push(...hostStatUpdates);

        // Create a map of distillery names to their IDs
        // First, get unique distilleries from the CSV data
        const distilleryMap = new Map<string, { id: string; name: string; country: string; region: string; coordinates: [number, number] | null }>();
        
        // Group by distillery name (case-insensitive)
        for (const whisky of parsed.data) {
          const distilleryKey = whisky.distillery.toLowerCase().trim();
          if (!distilleryMap.has(distilleryKey)) {
            const coordinates = getDistilleryCoordinates(
              whisky.distillery,
              whisky.country,
              whisky.region
            );
            distilleryMap.set(distilleryKey, {
              id: '',
              name: whisky.distillery.trim(),
              country: whisky.country.trim(),
              region: whisky.region.trim(),
              coordinates: coordinates,
            });
          }
        }

        // Check existing distilleries and create missing ones
        const existingDistilleries = new Map<string, DistilleryRow>();
        for (const dist of await loadDistilleries(ctx.db)) {
          const key = dist.name.toLowerCase();
          if (!existingDistilleries.has(key)) existingDistilleries.set(key, dist);
        }
        const distilleryIdMap = new Map<string, string>();
        const newDistilleries: { id: string; name: string; country: string; region: string; coordinates: [number, number] | undefined }[] = [];
        
        for (const [key, distilleryData] of distilleryMap.entries()) {
          // Check if distillery exists (case-insensitive match)
          const existing = existingDistilleries.get(distilleryData.name.toLowerCase());

          if (existing) {
            // Use existing distillery
            distilleryIdMap.set(key, existing.id);
            
            // Update coordinates if missing
            if (!existing.coordinates && distilleryData.coordinates) {
              statements.push(
                ctx.db
                  .update(distilleries)
                  .set({
                    coordinates: distilleryData.coordinates,
                    updatedAt: new Date(),
                  })
                  .where(eq(distilleries.id, existing.id))
              );
            }
          } else {
            // Create new distillery
            const id = crypto.randomUUID();
            newDistilleries.push({
              id,
              name: distilleryData.name,
              country: distilleryData.country,
              region: distilleryData.region,
              coordinates: distilleryData.coordinates || undefined,
            });
            
            distilleryIdMap.set(key, id);
          }
        }
        for (const rows of chunk(newDistilleries, maxInsertRows(distilleries))) {
          statements.push(ctx.db.insert(distilleries).values(rows));
        }

        // Import whiskies with gathering and distillery IDs
        const whiskyRows = parsed.data.map((whisky, index) => {
          const gatheringId = gatheringIdMap.get(whisky.gathering);
          const distilleryKey = whisky.distillery.toLowerCase().trim();
          const distilleryId = distilleryIdMap.get(distilleryKey);
          
          if (!gatheringId) {
            throw new Error(`Gathering ID not found for gathering number: ${whisky.gathering}`);
          }
          
          if (!distilleryId) {
            throw new Error(`Distillery ID not found for: ${whisky.distillery}`);
          }
          
          return {
            id: `w-import-${Date.now()}-${index}`,
            gatheringId: gatheringId,
            provider: whisky.provider,
            distilleryId: distilleryId,
            variety: whisky.variety || '',
            abv: parseABV(whisky.abv).toString(),
            notes: whisky.notes || null,
            ranking: parseRanking(whisky.notes),
            // Legacy fields
            name: null,
            type: null,
            age: null,
            priceRange: null,
            description: null,
            tastingNotes: null,
            flavourProfile: null,
          };
        });
        for (const rows of chunk(whiskyRows, maxInsertRows(whiskies))) {
          statements.push(ctx.db.insert(whiskies).values(rows));
        }

        await runBatched(ctx.db, statements);
        const imported = whiskyRows;

        return {
          success: true,
          errors: [],
          imported: imported.length,
        };
      } catch (error) {
        return {
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error during import'],
          imported: 0,
        };
      }
    }),

  // Import Excel data (Drams sheet format)
  importExcel: memberProcedure
    .input(
      z.object({
        fileData: z.string().min(1), // Base64 encoded file
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileData } = input;

      try {
        // Parse Excel straight from the base64 string (in memory; no filesystem in the Worker)
        const workbook = XLSX.read(fileData, { type: 'base64' });

        // Find "Drams" sheet or use first sheet
        const sheetName = workbook.SheetNames.find(name =>
          name.toLowerCase().includes('dram')
        ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<{
          Gathering: number;
          Theme: string;
          Date: string | number;
          Provider: string;
          Country: string;
          Region: string;
          Distillery: string;
          Variety: string;
          ABV: string | number;
          Host: string;
          Notes: string;
        }>(sheet);

        if (data.length === 0) {
          return {
            success: false,
            errors: ['No data found in Excel file'],
            imported: 0,
            updated: 0,
          };
        }

        // Filter out empty rows (no Gathering or no Distillery)
        const validRows = data.filter(row => row.Gathering && row.Distillery);

        let imported = 0;
        let updated = 0;
        const errors: string[] = [];

        // Writes are collected here and run in order at the end via db.batch
        const statements: BatchItem<"sqlite">[] = [];

        // Process hosts/members first (existing members loaded in one query)
        const memberMap = await loadMemberIdsByName(ctx.db);
        const newMembers: { id: string; name: string }[] = [];
        const hostNames = new Set<string>();
        for (const row of validRows) {
          if (row.Host) hostNames.add(String(row.Host).trim());
        }

        for (const hostName of hostNames) {
          const normalizedName = hostName.toLowerCase().trim();
          if (!memberMap.has(normalizedName)) {
            const id = crypto.randomUUID();
            newMembers.push({ id, name: hostName });
            memberMap.set(normalizedName, id);
          }
        }
        for (const rows of chunk(newMembers, maxInsertRows(members))) {
          statements.push(ctx.db.insert(members).values(rows));
        }

        // Process gatherings
        const existingGatheringIds = await loadGatheringIdsByNumber(ctx.db);
        const gatheringIdMap = new Map<number, string>();
        const gatheringsByNumber = new Map<number, typeof validRows[0]>();
        const newGatherings: { id: string; number: number; date: Date; hostId: string; theme: string | undefined }[] = [];

        for (const row of validRows) {
          if (!gatheringsByNumber.has(row.Gathering)) {
            gatheringsByNumber.set(row.Gathering, row);
          }
        }

        for (const [gatheringNum, row] of gatheringsByNumber.entries()) {
          const existingId = existingGatheringIds.get(Number(gatheringNum));

          if (existingId) {
            gatheringIdMap.set(gatheringNum, existingId);
          } else {
            const hostKey = String(row.Host || '').toLowerCase().trim();
            const hostId = memberMap.get(hostKey);

            if (!hostId) {
              errors.push(`No host found for gathering ${gatheringNum}`);
              continue;
            }

            // Parse date - handle Excel serial dates or string dates
            let gatheringDate: Date;
            if (typeof row.Date === 'number') {
              // Excel serial date
              gatheringDate = new Date((row.Date - 25569) * 86400 * 1000);
            } else {
              gatheringDate = parseDateString(String(row.Date));
            }

            const id = crypto.randomUUID();
            newGatherings.push({
              id,
              number: gatheringNum,
              date: gatheringDate,
              hostId: hostId,
              theme: row.Theme?.trim() || undefined,
            });

            gatheringIdMap.set(gatheringNum, id);
          }
        }
        for (const rows of chunk(newGatherings, maxInsertRows(gatherings))) {
          statements.push(ctx.db.insert(gatherings).values(rows));
        }

        // Process distilleries with fuzzy matching (against all distilleries, loaded once; new
        // ones are appended so later rows can match them)
        const allDistilleries = await loadDistilleries(ctx.db);
        const distilleryIdMap = new Map<string, string>();
        const fuzzyMatches: string[] = [];
        const newDistilleries: { id: string; name: string; country: string; region: string; coordinates: [number, number] | undefined }[] = [];

        for (const row of validRows) {
          const distilleryKey = String(row.Distillery).toLowerCase().trim();

          if (!distilleryIdMap.has(distilleryKey)) {
            const distilleryName = String(row.Distillery).trim();
            const countryName = String(row.Country || '').trim();
            const regionName = String(row.Region || '').trim();

            // Try fuzzy matching
            const fuzzyMatch = findMatchingDistillery(
              allDistilleries,
              distilleryName,
              countryName,
              regionName,
              0.75 // 75% similarity threshold
            );

            if (fuzzyMatch) {
              distilleryIdMap.set(distilleryKey, fuzzyMatch.id);

              // Log fuzzy matches that weren't exact
              if (fuzzyMatch.score < 1) {
                fuzzyMatches.push(`"${distilleryName}" → "${fuzzyMatch.name}" (${(fuzzyMatch.score * 100).toFixed(0)}% match)`);
              }
            } else {
              // No match found, create new distillery
              const coordinates = getDistilleryCoordinates(
                distilleryName,
                countryName,
                regionName
              );

              const newDistillery = {
                id: crypto.randomUUID(),
                name: distilleryName,
                country: countryName,
                region: regionName,
                coordinates: coordinates || undefined,
              };
              newDistilleries.push(newDistillery);
              allDistilleries.push({ ...newDistillery, coordinates: coordinates || null });

              distilleryIdMap.set(distilleryKey, newDistillery.id);
            }
          }
        }
        for (const rows of chunk(newDistilleries, maxInsertRows(distilleries))) {
          statements.push(ctx.db.insert(distilleries).values(rows));
        }

        // Add fuzzy match info to response
        if (fuzzyMatches.length > 0) {
          errors.push(`Fuzzy matched distilleries: ${fuzzyMatches.join(', ')}`);
        }

        // Existing whiskies keyed by gathering + distillery + variety (case-insensitive), loaded once
        const whiskyKey = (gatheringId: string, distilleryId: string, variety: string) =>
          `${gatheringId}|${distilleryId}|${variety.toLowerCase()}`;
        const existingWhiskies = new Map<string, string>();
        for (const whisky of await ctx.db
          .select({ id: whiskies.id, gatheringId: whiskies.gatheringId, distilleryId: whiskies.distilleryId, variety: whiskies.variety })
          .from(whiskies)) {
          const key = whiskyKey(whisky.gatheringId, whisky.distilleryId, whisky.variety);
          if (!existingWhiskies.has(key)) existingWhiskies.set(key, whisky.id);
        }
        const newWhiskies: (typeof whiskies.$inferInsert)[] = [];
        const whiskyUpdates: BatchItem<"sqlite">[] = [];

        // Process whiskies - upsert based on gathering, distillery, and variety
        for (const row of validRows) {
          const gatheringId = gatheringIdMap.get(row.Gathering);
          const distilleryKey = String(row.Distillery).toLowerCase().trim();
          const distilleryId = distilleryIdMap.get(distilleryKey);

          if (!gatheringId || !distilleryId) {
            errors.push(`Skipping row: G${row.Gathering} ${row.Distillery} - missing gathering or distillery`);
            continue;
          }

          const varietyStr = String(row.Variety || '').trim();
          const providerStr = String(row.Provider || '').trim();

          // Parse ABV
          let abvValue: number;
          if (typeof row.ABV === 'number') {
            abvValue = row.ABV > 1 ? row.ABV : row.ABV * 100; // Handle 0.46 vs 46
          } else {
            abvValue = parseABV(String(row.ABV || '0'));
          }

          const ranking = parseRanking(row.Notes);
          const notesStr = row.Notes ? String(row.Notes).trim() : null;

          // Check if whisky exists (by gathering + distillery + variety)
          const key = whiskyKey(gatheringId, distilleryId, varietyStr || '');
          const existingWhiskyId = existingWhiskies.get(key);

          if (existingWhiskyId) {
            // Update existing whisky (runs after the inserts, so it may target one inserted above)
            whiskyUpdates.push(
              ctx.db
                .update(whiskies)
                .set({
                  provider: providerStr,
                  abv: abvValue.toString(),
                  notes: notesStr,
                  ranking: ranking,
                  updatedAt: new Date(),
                })
                .where(eq(whiskies.id, existingWhiskyId))
            );
            updated++;
          } else {
            // Insert new whisky
            const id = crypto.randomUUID();
            newWhiskies.push({
              id,
              gatheringId: gatheringId,
              distilleryId: distilleryId,
              provider: providerStr,
              variety: varietyStr,
              abv: abvValue.toString(),
              notes: notesStr,
              ranking: ranking,
            });
            existingWhiskies.set(key, id);
            imported++;
          }
        }
        for (const rows of chunk(newWhiskies, maxInsertRows(whiskies))) {
          statements.push(ctx.db.insert(whiskies).values(rows));
        }
        statements.push(...whiskyUpdates);

        await runBatched(ctx.db, statements);

        return {
          success: true,
          errors,
          imported,
          updated,
        };
      } catch (error) {
        return {
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error during import'],
          imported: 0,
          updated: 0,
        };
      }
    }),
});

// Helper to parse various date string formats
function parseDateString(dateStr: string): Date {
  // Try "Friday, November 15, 2019" format
  const longFormat = dateStr.match(/(\w+),?\s+(\w+)\s+(\d+),?\s+(\d+)/);
  if (longFormat) {
    const months: Record<string, number> = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    const month = months[longFormat[2].toLowerCase()];
    const day = parseInt(longFormat[3]);
    const year = parseInt(longFormat[4]);
    return new Date(year, month, day);
  }

  // Try "15 November 2019" format
  const shortFormat = dateStr.match(/(\d+)\s+(\w+)\s+(\d+)/);
  if (shortFormat) {
    const months: Record<string, number> = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    const day = parseInt(shortFormat[1]);
    const month = months[shortFormat[2].toLowerCase()];
    const year = parseInt(shortFormat[3]);
    return new Date(year, month, day);
  }

  // Fallback to JS Date parsing
  return new Date(dateStr);
}


