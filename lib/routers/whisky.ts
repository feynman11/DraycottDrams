import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { whiskies } from "@/db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";
import { z } from "zod";

export const whiskyRouter = createTRPCRouter({
  // Get all whiskies with optional filtering
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        region: z.string().optional(),
        type: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { search, region, type, limit = 50, offset = 0 } = input || {};

      let whereConditions = [];

      if (search) {
        whereConditions.push(ilike(whiskies.name, `%${search}%`));
      }

      if (region) {
        whereConditions.push(eq(whiskies.region, region));
      }

      if (type) {
        whereConditions.push(eq(whiskies.type, type));
      }

      const result = await db
        .select()
        .from(whiskies)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(limit)
        .offset(offset);
      return result;
    }),

  // Get whisky by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;

      const result = await db
        .select()
        .from(whiskies)
        .where(eq(whiskies.id, id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Whisky not found");
      }

      return result[0];
    }),

  // Get whiskies by location proximity (simplified)
  getNearby: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().default(1000), // km
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const { lat, lng, radius, limit } = input;

      // Simple distance calculation using PostgreSQL's earthdistance extension would be ideal
      // For now, we'll return all whiskies (in a real implementation, use proper geospatial queries)
      const result = await db
        .select()
        .from(whiskies)
        .limit(limit);

      return result;
    }),

  // Get whisky statistics
  getStats: publicProcedure.query(async () => {
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(whiskies);

    const regions = await db
      .select({
        region: whiskies.region,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .groupBy(whiskies.region);

    const types = await db
      .select({
        type: whiskies.type,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .groupBy(whiskies.type);

    return {
      total: totalCount[0]?.count || 0,
      regions,
      types,
    };
  }),
});
