import { db } from "../lib/db";
import { whiskies } from "../db/schema";
import { sql } from "drizzle-orm";

// Parse ranking text to number
function parseRanking(notes: string | null): number | null {
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

async function updateRankings() {
  console.log("Fetching all whiskies...");

  const allWhiskies = await db.select().from(whiskies);
  console.log(`Found ${allWhiskies.length} whiskies`);

  let updated = 0;
  let skipped = 0;

  for (const whisky of allWhiskies) {
    const ranking = parseRanking(whisky.notes);

    if (ranking !== null) {
      await db
        .update(whiskies)
        .set({ ranking })
        .where(sql`${whiskies.id} = ${whisky.id}`);

      console.log(`  Updated: ${whisky.id} -> ranking ${ranking} (from "${whisky.notes}")`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated} whiskies with rankings`);
  console.log(`Skipped: ${skipped} whiskies (no ranking in notes)`);
}

updateRankings()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error updating rankings:", error);
    process.exit(1);
  });
