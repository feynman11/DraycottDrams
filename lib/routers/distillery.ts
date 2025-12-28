import { createTRPCRouter, publicProcedure, adminProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { distilleries } from "@/db/schema";
import { eq, ilike, and, sql, or } from "drizzle-orm";
import { z } from "zod";

export const distilleryRouter = createTRPCRouter({
  // Get all distilleries
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        limit: z.number().min(1).max(1000).default(1000),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { search, country, region, limit = 1000, offset = 0 } = input || {};

      let whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            ilike(distilleries.name, `%${search}%`),
            ilike(distilleries.country, `%${search}%`),
            ilike(distilleries.region, `%${search}%`)
          )!
        );
      }

      if (country) {
        whereConditions.push(eq(distilleries.country, country));
      }

      if (region) {
        whereConditions.push(eq(distilleries.region, region));
      }

      const result = await db
        .select()
        .from(distilleries)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Get distillery by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;

      const result = await db
        .select()
        .from(distilleries)
        .where(eq(distilleries.id, id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Distillery not found");
      }

      return result[0];
    }),

  // Create distillery (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        country: z.string().min(1),
        region: z.string().min(1),
        coordinates: z.tuple([z.number(), z.number()]).optional(),
        description: z.string().optional(),
        website: z.string().url().optional().or(z.literal("")),
        founded: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { website, ...data } = input;
      const result = await db
        .insert(distilleries)
        .values({
          ...data,
          website: website || undefined,
        })
        .returning();

      return result[0];
    }),

  // Update distillery (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        country: z.string().min(1).optional(),
        region: z.string().min(1).optional(),
        coordinates: z.tuple([z.number(), z.number()]).optional(),
        description: z.string().optional(),
        website: z.string().url().optional().or(z.literal("")),
        founded: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, website, ...updateData } = input;

      const result = await db
        .update(distilleries)
        .set({
          ...updateData,
          website: website !== undefined ? (website || undefined) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(distilleries.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Distillery not found");
      }

      return result[0];
    }),

  // Delete distillery (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      // Check if distillery has whiskies
      const { whiskies } = await import("@/db/schema");
      const whiskiesCount = await db
        .select()
        .from(whiskies)
        .where(eq(whiskies.distilleryId, id))
        .limit(1);

      if (whiskiesCount.length > 0) {
        throw new Error("Cannot delete distillery that has associated whiskies");
      }

      const result = await db
        .delete(distilleries)
        .where(eq(distilleries.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Distillery not found");
      }

      return { success: true };
    }),

  // Get distillery statistics
  getStats: publicProcedure.query(async () => {
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(distilleries);

    const countries = await db
      .select({
        country: distilleries.country,
        count: sql<number>`count(*)`,
      })
      .from(distilleries)
      .groupBy(distilleries.country);

    const regions = await db
      .select({
        region: distilleries.region,
        count: sql<number>`count(*)`,
      })
      .from(distilleries)
      .groupBy(distilleries.region);

    return {
      total: totalCount[0]?.count || 0,
      countries,
      regions,
    };
  }),
});

