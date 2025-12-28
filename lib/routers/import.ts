import { createTRPCRouter, memberProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { whiskies, distilleries, gatherings, members } from "@/db/schema";
import { parseCSV, generateCSVTemplate } from "@/lib/csv-parser";
import { getDistilleryCoordinates } from "@/lib/distillery-coordinates";
import { z } from "zod";
import { eq, ilike } from "drizzle-orm";

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
    .mutation(async ({ input }) => {
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
        // Clear existing data if requested
        if (clearExisting) {
          await db.delete(whiskies);
        }

        // Create a map of member names to their IDs
        const memberMap = new Map<string, string>();
        
        // Get unique host names from CSV
        const hostNames = new Set<string>();
        for (const whisky of parsed.data) {
          hostNames.add(whisky.host.trim());
        }

        // Get or create members for each host
        for (const hostName of hostNames) {
          const normalizedName = hostName.toLowerCase().trim();
          
          // Check if member exists (case-insensitive)
          const existing = await db
            .select()
            .from(members)
            .where(ilike(members.name, hostName))
            .limit(1);

          if (existing.length > 0) {
            memberMap.set(normalizedName, existing[0].id);
          } else {
            // Create new member
            const newMember = await db
              .insert(members)
              .values({
                name: hostName,
              })
              .returning();
            
            memberMap.set(normalizedName, newMember[0].id);
          }
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
        const gatheringIdMap = new Map<number, string>();
        
        for (const [number, gatheringData] of gatheringMap.entries()) {
          // Check if gathering exists by number
          const existing = await db
            .select()
            .from(gatherings)
            .where(eq(gatherings.number, number))
            .limit(1);

          if (existing.length > 0) {
            // Use existing gathering
            gatheringIdMap.set(number, existing[0].id);
          } else {
            // Create new gathering
            const newGathering = await db
              .insert(gatherings)
              .values({
                number: gatheringData.number,
                date: gatheringData.date,
                hostId: gatheringData.hostId,
                theme: gatheringData.theme || undefined,
              })
              .returning();
            
            gatheringIdMap.set(number, newGathering[0].id);

            // Update member hosting stats
            const memberResult = await db
              .select({ timesHosted: members.timesHosted })
              .from(members)
              .where(eq(members.id, gatheringData.hostId))
              .limit(1);

            if (memberResult.length > 0) {
              await db
                .update(members)
                .set({
                  timesHosted: memberResult[0].timesHosted + 1,
                  lastHosted: gatheringData.date,
                  updatedAt: new Date(),
                })
                .where(eq(members.id, gatheringData.hostId));
            }
          }
        }

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
        const distilleryIdMap = new Map<string, string>();
        
        for (const [key, distilleryData] of distilleryMap.entries()) {
          // Check if distillery exists (case-insensitive match)
          const existing = await db
            .select()
            .from(distilleries)
            .where(ilike(distilleries.name, distilleryData.name))
            .limit(1);

          if (existing.length > 0) {
            // Use existing distillery
            distilleryIdMap.set(key, existing[0].id);
            
            // Update coordinates if missing
            if (!existing[0].coordinates && distilleryData.coordinates) {
              await db
                .update(distilleries)
                .set({
                  coordinates: distilleryData.coordinates,
                  updatedAt: new Date(),
                })
                .where(eq(distilleries.id, existing[0].id));
            }
          } else {
            // Create new distillery
            const newDistillery = await db
              .insert(distilleries)
              .values({
                name: distilleryData.name,
                country: distilleryData.country,
                region: distilleryData.region,
                coordinates: distilleryData.coordinates || undefined,
              })
              .returning();
            
            distilleryIdMap.set(key, newDistillery[0].id);
          }
        }

        // Import whiskies with gathering and distillery IDs
        const imported = await db.insert(whiskies).values(
          parsed.data.map((whisky, index) => {
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
              // Legacy fields
              name: null,
              type: null,
              age: null,
              priceRange: null,
              description: null,
              tastingNotes: null,
              flavourProfile: null,
            };
          })
        ).returning();

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
});


