import { db } from "../lib/db";
import { whiskies, gatherings, distilleries } from "../db/schema";
import { eq, isNotNull, sql } from "drizzle-orm";

async function verifyRankings() {
  // Count by ranking
  const byRanking = await db
    .select({
      ranking: whiskies.ranking,
      count: sql<number>`count(*)`
    })
    .from(whiskies)
    .where(isNotNull(whiskies.ranking))
    .groupBy(whiskies.ranking)
    .orderBy(whiskies.ranking);

  console.log("Rankings breakdown:");
  const ordinals = ["", "st", "nd", "rd", "th", "th", "th"];
  byRanking.forEach(r => {
    const ord = ordinals[r.ranking!] || "th";
    console.log(`  ${r.ranking}${ord}: ${r.count} whiskies`);
  });

  // Sample winners
  const winners = await db
    .select({
      gathering: gatherings.number,
      distillery: distilleries.name,
      variety: whiskies.variety
    })
    .from(whiskies)
    .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
    .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
    .where(eq(whiskies.ranking, 1))
    .orderBy(gatherings.number);

  console.log(`\nAll ${winners.length} winners:`);
  winners.forEach(w => console.log(`  G${w.gathering}: ${w.distillery} ${w.variety}`));
}

verifyRankings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
