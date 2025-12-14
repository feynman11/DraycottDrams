import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { whiskies } from "@/db/schema";
import { parseCSV, generateCSVTemplate } from "@/lib/csv-parser";
import { getDistilleryCoordinates } from "@/lib/distillery-coordinates";
import { z } from "zod";
import { eq } from "drizzle-orm";

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
  getTemplate: publicProcedure.query(() => {
    return {
      csv: generateCSVTemplate(),
    };
  }),

  // Import CSV data
  importCSV: publicProcedure
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

        // Import data with coordinates lookup
        const imported = await db.insert(whiskies).values(
          parsed.data.map((whisky, index) => {
            const coordinates = getDistilleryCoordinates(
              whisky.distillery,
              whisky.country,
              whisky.region
            );
            
            return {
              id: `w-import-${Date.now()}-${index}`,
              gathering: whisky.gathering,
              theme: whisky.theme || '',
              date: parseDate(whisky.date),
              provider: whisky.provider,
              country: whisky.country,
              region: whisky.region,
              distillery: whisky.distillery,
              variety: whisky.variety || '',
              abv: parseABV(whisky.abv).toString(),
              host: whisky.host,
              notes: whisky.notes || null,
              // Legacy fields
              name: null,
              type: null,
              age: null,
              priceRange: null,
              description: null,
              tastingNotes: null,
              coordinates: coordinates,
              flavorProfile: null,
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
