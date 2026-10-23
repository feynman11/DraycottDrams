// Usage: pnpm exec tsx scripts/update-rankings.ts [--local | --env staging | --remote]  (see scripts/lib/d1.ts)
import { whiskies } from "../db/schema";
import { eq } from "drizzle-orm";
import { runBatched, withD1, type D1Handle } from "./lib/d1";

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

async function updateRankings({ db }: D1Handle) {
  console.log("Fetching all whiskies...");

  const allWhiskies = await db.select().from(whiskies);
  console.log(`Found ${allWhiskies.length} whiskies`);

  let updated = 0;
  let skipped = 0;
  const updates = [];

  for (const whisky of allWhiskies) {
    const ranking = parseRanking(whisky.notes);

    if (ranking !== null) {
      updates.push(db.update(whiskies).set({ ranking }).where(eq(whiskies.id, whisky.id)));

      console.log(`  Updated: ${whisky.id} -> ranking ${ranking} (from "${whisky.notes}")`);
      updated++;
    } else {
      skipped++;
    }
  }

  await runBatched(db, updates);

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated} whiskies with rankings`);
  console.log(`Skipped: ${skipped} whiskies (no ranking in notes)`);
}

withD1(async (handle) => {
  await updateRankings(handle);
  console.log("\nDone!");
});
