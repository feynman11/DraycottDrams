import { createTRPCRouter, publicProcedure, adminProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { whiskies, distilleries, gatherings } from "@/db/schema";
import { eq, ilike, sql, and, or } from "drizzle-orm";
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
          or(
            ilike(distilleries.name, `%${search}%`),
            ilike(whiskies.name, `%${search}%`),
            ilike(distilleries.country, `%${search}%`),
            ilike(distilleries.region, `%${search}%`)
          )!
        );
      }

      if (region) {
        whereConditions.push(eq(distilleries.region, region));
      }

      if (country) {
        whereConditions.push(eq(distilleries.country, country));
      }

      if (gathering) {
        whereConditions.push(eq(gatherings.number, gathering));
      }

      if (theme) {
        whereConditions.push(ilike(gatherings.theme, `%${theme}%`));
      }

      if (provider) {
        whereConditions.push(ilike(whiskies.provider, `%${provider}%`));
      }

      if (host) {
        const { members } = await import("@/db/schema");
        whereConditions.push(ilike(members.name, `%${host}%`));
      }

      if (variety) {
        whereConditions.push(ilike(whiskies.variety, `%${variety}%`));
      }

      const { members } = await import("@/db/schema");
      
      // Build query with joins
      let query = db
        .select({
          id: whiskies.id,
          gatheringId: whiskies.gatheringId,
          provider: whiskies.provider,
          distilleryId: whiskies.distilleryId,
          variety: whiskies.variety,
          abv: whiskies.abv,
          notes: whiskies.notes,
          name: whiskies.name,
          type: whiskies.type,
          age: whiskies.age,
          priceRange: whiskies.priceRange,
          description: whiskies.description,
          tastingNotes: whiskies.tastingNotes,
          flavourProfile: whiskies.flavourProfile,
          imageUrl: whiskies.imageUrl,
          createdAt: whiskies.createdAt,
          updatedAt: whiskies.updatedAt,
          distillery: {
            id: distilleries.id,
            name: distilleries.name,
            country: distilleries.country,
            region: distilleries.region,
            coordinates: distilleries.coordinates,
          },
          gathering: {
            id: gatherings.id,
            number: gatherings.number,
            date: gatherings.date,
            theme: gatherings.theme,
          },
          host: {
            id: members.id,
            name: members.name,
          },
        })
        .from(whiskies)
        .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
        .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
        .leftJoin(members, eq(gatherings.hostId, members.id));

      const result = await query
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(limit)
        .offset(offset);

      return result.map((row) => ({
        ...row,
        // Flatten for backward compatibility
        distillery: row.distillery.name,
        country: row.distillery.country,
        region: row.distillery.region,
        coordinates: row.distillery.coordinates,
        gathering: row.gathering.number,
        theme: row.gathering.theme || '',
        date: row.gathering.date,
        host: row.host?.name || '',
      }));
    }),

  // Get whisky by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      const { members } = await import("@/db/schema");

      const result = await db
        .select({
          id: whiskies.id,
          gatheringId: whiskies.gatheringId,
          provider: whiskies.provider,
          distilleryId: whiskies.distilleryId,
          variety: whiskies.variety,
          abv: whiskies.abv,
          notes: whiskies.notes,
          name: whiskies.name,
          type: whiskies.type,
          age: whiskies.age,
          priceRange: whiskies.priceRange,
          description: whiskies.description,
          tastingNotes: whiskies.tastingNotes,
          flavourProfile: whiskies.flavourProfile,
          imageUrl: whiskies.imageUrl,
          createdAt: whiskies.createdAt,
          updatedAt: whiskies.updatedAt,
          distillery: {
            id: distilleries.id,
            name: distilleries.name,
            country: distilleries.country,
            region: distilleries.region,
            coordinates: distilleries.coordinates,
          },
          gathering: {
            id: gatherings.id,
            number: gatherings.number,
            date: gatherings.date,
            theme: gatherings.theme,
            hostId: gatherings.hostId,
          },
          host: {
            id: members.id,
            name: members.name,
          },
        })
        .from(whiskies)
        .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
        .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
        .leftJoin(members, eq(gatherings.hostId, members.id))
        .where(eq(whiskies.id, id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Whisky not found");
      }

      const row = result[0];
      return {
        ...row,
        // Flatten for backward compatibility
        distillery: (row.distillery as any).name,
        country: (row.distillery as any).country,
        region: (row.distillery as any).region,
        coordinates: (row.distillery as any).coordinates,
        gathering: (row.gathering as any).number,
        theme: (row.gathering as any).theme || '',
        date: (row.gathering as any).date,
        host: (row.host as any)?.name || '',
      };
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
        region: distilleries.region,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
      .groupBy(distilleries.region);

    const countries = await db
      .select({
        country: distilleries.country,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
      .groupBy(distilleries.country);

    const gatheringsStats = await db
      .select({
        gathering: gatherings.number,
        count: sql<number>`count(*)`,
      })
      .from(whiskies)
      .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
      .groupBy(gatherings.number);

    return {
      total: totalCount[0]?.count || 0,
      regions,
      countries,
      gatherings: gatheringsStats,
    };
  }),

  // Create whisky (admin only)
  create: adminProcedure
    .input(
      z.object({
        gatheringId: z.string().min(1),
        provider: z.string().min(1),
        distilleryId: z.string().min(1),
        variety: z.string().min(1),
        abv: z.string().min(1),
        notes: z.string().optional().nullable(),
        name: z.string().optional(),
        type: z.string().optional(),
        age: z.number().optional(),
        priceRange: z.string().optional(),
        description: z.string().optional(),
        flavourProfile: z.object({
          peat: z.number(),
          fruit: z.number(),
          floral: z.number(),
          spice: z.number(),
          wood: z.number(),
          sweetness: z.number(),
        }).optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .insert(whiskies)
        .values({
          gatheringId: input.gatheringId,
          provider: input.provider,
          distilleryId: input.distilleryId,
          variety: input.variety,
          abv: input.abv,
          notes: input.notes || null,
          name: input.name || null,
          type: input.type || null,
          age: input.age || null,
          priceRange: input.priceRange || null,
          description: input.description || null,
          flavourProfile: input.flavourProfile || null,
          imageUrl: input.imageUrl || null,
        })
        .returning();

      return result[0];
    }),

  // Update whisky (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        gatheringId: z.string().optional(),
        provider: z.string().optional(),
        distilleryId: z.string().optional(),
        variety: z.string().optional(),
        abv: z.string().optional(),
        notes: z.string().optional().nullable(),
        name: z.string().optional(),
        type: z.string().optional(),
        age: z.number().optional(),
        priceRange: z.string().optional(),
        description: z.string().optional(),
        flavourProfile: z.object({
          peat: z.number(),
          fruit: z.number(),
          floral: z.number(),
          spice: z.number(),
          wood: z.number(),
          sweetness: z.number(),
        }).optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Convert abv string to decimal if provided
      const updateValues: any = { ...updateData };
      if (updateValues.abv !== undefined) {
        updateValues.abv = updateValues.abv.toString();
      }

      const result = await db
        .update(whiskies)
        .set({
          ...updateValues,
          updatedAt: new Date(),
        })
        .where(eq(whiskies.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Whisky not found");
      }

      return result[0];
    }),

  // Delete whisky (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      const result = await db
        .delete(whiskies)
        .where(eq(whiskies.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Whisky not found");
      }

      return { success: true };
    }),
});
