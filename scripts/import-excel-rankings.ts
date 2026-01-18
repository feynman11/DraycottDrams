import * as XLSX from "xlsx";
import { db } from "../lib/db";
import { whiskies, gatherings, distilleries } from "../db/schema";
import { eq, and, ilike } from "drizzle-orm";

// Parse ranking text to number
function parseRanking(notes: string | null | undefined): number | null {
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

async function importRankingsFromExcel() {
  const filePath = "data/Drams.xlsx";
  console.log(`Reading Excel file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<{
    Gathering: number;
    Theme: string;
    Date: string;
    Provider: string;
    Country: string;
    Region: string;
    Distillery: string;
    Variety: string;
    ABV: string;
    Host: string;
    Notes: string;
  }>(sheet);

  console.log(`Found ${data.length} rows in Excel\n`);

  let updated = 0;
  let notFound = 0;
  let noRanking = 0;

  for (const row of data) {
    // Skip rows without distillery (empty rows)
    if (!row.Distillery) {
      continue;
    }

    const ranking = parseRanking(row.Notes);

    if (ranking === null) {
      noRanking++;
      continue;
    }

    // Find the gathering
    const gatheringResult = await db
      .select()
      .from(gatherings)
      .where(eq(gatherings.number, row.Gathering))
      .limit(1);

    if (gatheringResult.length === 0) {
      console.log(`  Gathering ${row.Gathering} not found`);
      notFound++;
      continue;
    }

    const gatheringId = gatheringResult[0].id;

    // Find the distillery
    const distilleryResult = await db
      .select()
      .from(distilleries)
      .where(ilike(distilleries.name, row.Distillery.trim()))
      .limit(1);

    if (distilleryResult.length === 0) {
      console.log(`  Distillery "${row.Distillery}" not found`);
      notFound++;
      continue;
    }

    const distilleryId = distilleryResult[0].id;

    // Find and update the whisky
    const varietyStr = String(row.Variety || '').trim();
    const whiskyResult = await db
      .select()
      .from(whiskies)
      .where(
        and(
          eq(whiskies.gatheringId, gatheringId),
          eq(whiskies.distilleryId, distilleryId),
          ilike(whiskies.variety, varietyStr)
        )
      )
      .limit(1);

    if (whiskyResult.length === 0) {
      // Try without variety match
      const whiskyResult2 = await db
        .select()
        .from(whiskies)
        .where(
          and(
            eq(whiskies.gatheringId, gatheringId),
            eq(whiskies.distilleryId, distilleryId)
          )
        );

      if (whiskyResult2.length === 1) {
        // Only one match, update it
        await db
          .update(whiskies)
          .set({ ranking, notes: row.Notes })
          .where(eq(whiskies.id, whiskyResult2[0].id));

        console.log(`  Updated: G${row.Gathering} ${row.Distillery} -> ${ranking}${getOrdinal(ranking)}`);
        updated++;
      } else if (whiskyResult2.length > 1) {
        // Multiple matches, try to find by provider
        const byProvider = whiskyResult2.find(w =>
          w.provider.toLowerCase() === row.Provider?.toLowerCase()
        );
        if (byProvider) {
          await db
            .update(whiskies)
            .set({ ranking, notes: row.Notes })
            .where(eq(whiskies.id, byProvider.id));

          console.log(`  Updated: G${row.Gathering} ${row.Distillery} -> ${ranking}${getOrdinal(ranking)}`);
          updated++;
        } else {
          console.log(`  Multiple matches for G${row.Gathering} ${row.Distillery}, skipping`);
          notFound++;
        }
      } else {
        console.log(`  Whisky not found: G${row.Gathering} ${row.Distillery} ${row.Variety}`);
        notFound++;
      }
    } else {
      await db
        .update(whiskies)
        .set({ ranking, notes: row.Notes })
        .where(eq(whiskies.id, whiskyResult[0].id));

      console.log(`  Updated: G${row.Gathering} ${row.Distillery} -> ${ranking}${getOrdinal(ranking)}`);
      updated++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated} whiskies with rankings`);
  console.log(`Not found: ${notFound} whiskies`);
  console.log(`No ranking: ${noRanking} rows (no ranking in Notes)`);
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

importRankingsFromExcel()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error importing rankings:", error);
    process.exit(1);
  });
