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
        country: z.string().optional(),
        gathering: z.number().optional(),
        theme: z.string().optional(),
        provider: z.string().optional(),
        host: z.string().optional(),
        variety: z.string().optional(),
        limit: z.number().min(1).max(1000).default(1000),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { search, region, country, gathering, theme, provider, host, variety, limit = 50, offset = 0 } = input || {};

      let whereConditions = [];

      if (search) {
        whereConditions.push(
          ilike(whiskies.distillery, `%${search}%`)
        );
      }

      if (region) {
        whereConditions.push(eq(whiskies.region, region));
      }

      if (country) {
        whereConditions.push(eq(whiskies.country, country));
      }

      if (gathering) {
        whereConditions.push(eq(whiskies.gathering, gathering));
      }

      if (theme) {
        whereConditions.push(ilike(whiskies.theme, `%${theme}%`));
      }

      if (provider) {
        whereConditions.push(ilike(whiskies.provider, `%${provider}%`));
      }

      if (host) {
        whereConditions.push(ilike(whiskies.host, `%${host}%`));
      }

      if (variety) {
        whereConditions.push(ilike(whiskies.variety, `%${variety}%`));
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

    const countries = await db
      .select({
        country: whiskies.country,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .groupBy(whiskies.country);

    const gatherings = await db
      .select({
        gathering: whiskies.gathering,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .groupBy(whiskies.gathering);

    return {
      total: totalCount[0]?.count || 0,
      regions,
      countries,
      gatherings,
    };
  }),
});
