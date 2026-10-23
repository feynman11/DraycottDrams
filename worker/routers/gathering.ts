import { createTRPCRouter, publicProcedure, adminProcedure } from "@/worker/trpc";
import { gatherings, members } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

export const gatheringRouter = createTRPCRouter({
  // Get all gatherings
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db
        .select({
          id: gatherings.id,
          number: gatherings.number,
          date: gatherings.date,
          hostId: gatherings.hostId,
          theme: gatherings.theme,
          createdAt: gatherings.createdAt,
          updatedAt: gatherings.updatedAt,
          host: {
            id: members.id,
            name: members.name,
            timesHosted: members.timesHosted,
            lastHosted: members.lastHosted,
          },
        })
        .from(gatherings)
        .innerJoin(members, eq(gatherings.hostId, members.id))
        .orderBy(desc(gatherings.number));

      return result.map((row) => ({
        id: row.id,
        number: row.number,
        date: row.date,
        hostId: row.hostId,
        theme: row.theme,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        host: row.host,
      }));
    }),

  // Get gathering by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const result = await ctx.db
        .select({
          id: gatherings.id,
          number: gatherings.number,
          date: gatherings.date,
          hostId: gatherings.hostId,
          theme: gatherings.theme,
          createdAt: gatherings.createdAt,
          updatedAt: gatherings.updatedAt,
          host: {
            id: members.id,
            name: members.name,
            timesHosted: members.timesHosted,
            lastHosted: members.lastHosted,
          },
        })
        .from(gatherings)
        .innerJoin(members, eq(gatherings.hostId, members.id))
        .where(eq(gatherings.id, id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Gathering not found");
      }

      const row = result[0];
      return {
        id: row.id,
        number: row.number,
        date: row.date,
        hostId: row.hostId,
        theme: row.theme,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        host: row.host,
      };
    }),

  // Get gathering by number
  getByNumber: publicProcedure
    .input(z.object({ number: z.number() }))
    .query(async ({ ctx, input }) => {
      const { number } = input;

      const result = await ctx.db
        .select({
          id: gatherings.id,
          number: gatherings.number,
          date: gatherings.date,
          hostId: gatherings.hostId,
          theme: gatherings.theme,
          createdAt: gatherings.createdAt,
          updatedAt: gatherings.updatedAt,
          host: {
            id: members.id,
            name: members.name,
            timesHosted: members.timesHosted,
            lastHosted: members.lastHosted,
          },
        })
        .from(gatherings)
        .innerJoin(members, eq(gatherings.hostId, members.id))
        .where(eq(gatherings.number, number))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Gathering not found");
      }

      const row = result[0];
      return {
        id: row.id,
        number: row.number,
        date: row.date,
        hostId: row.hostId,
        theme: row.theme,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        host: row.host,
      };
    }),

  // Create gathering (admin only)
  create: adminProcedure
    .input(
      z.object({
        number: z.number().int().positive(),
        date: z.date(),
        hostId: z.string().min(1),
        theme: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Insert the gathering and bump the host's hosting stats atomically (D1 has no
      // interactive transactions, so use a batch; the update is a no-op if the host is missing)
      const [result] = await ctx.db.batch([
        ctx.db
          .insert(gatherings)
          .values({
            number: input.number,
            date: input.date,
            hostId: input.hostId,
            theme: input.theme || undefined,
          })
          .returning(),
        ctx.db
          .update(members)
          .set({
            timesHosted: sql`${members.timesHosted} + 1`,
            lastHosted: input.date,
            updatedAt: new Date(),
          })
          .where(eq(members.id, input.hostId)),
      ]);

      return result[0];
    }),

  // Update gathering (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        number: z.number().int().positive().optional(),
        date: z.date().optional(),
        hostId: z.string().min(1).optional(),
        theme: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, hostId, date, ...updateData } = input;

      // Get current gathering to check if host changed
      const current = await ctx.db
        .select()
        .from(gatherings)
        .where(eq(gatherings.id, id))
        .limit(1);

      if (current.length === 0) {
        throw new Error("Gathering not found");
      }

      const oldHostId = current[0].hostId;
      const newHostId = hostId || oldHostId;
      const gatheringDate = date || current[0].date;

      // Update gathering
      const result = await ctx.db
        .update(gatherings)
        .set({
          ...updateData,
          hostId: newHostId,
          date: gatheringDate,
          updatedAt: new Date(),
        })
        .where(eq(gatherings.id, id))
        .returning();

      // Update hosting stats if host changed
      if (hostId && hostId !== oldHostId) {
        // Decrease old host's count and recalculate lastHosted
        const oldMember = await ctx.db
          .select({ timesHosted: members.timesHosted })
          .from(members)
          .where(eq(members.id, oldHostId))
          .limit(1);

        if (oldMember.length > 0 && oldMember[0].timesHosted > 0) {
          // Find most recent hosting date for old host
          const recentGathering = await ctx.db
            .select({ date: gatherings.date })
            .from(gatherings)
            .where(eq(gatherings.hostId, oldHostId))
            .orderBy(desc(gatherings.date))
            .limit(1);

          await ctx.db
            .update(members)
            .set({
              timesHosted: oldMember[0].timesHosted - 1,
              lastHosted: recentGathering.length > 0 ? recentGathering[0].date : null,
              updatedAt: new Date(),
            })
            .where(eq(members.id, oldHostId));
        }

        // Increase new host's count
        const newMember = await ctx.db
          .select({ timesHosted: members.timesHosted })
          .from(members)
          .where(eq(members.id, newHostId))
          .limit(1);

        if (newMember.length > 0) {
          await ctx.db
            .update(members)
            .set({
              timesHosted: newMember[0].timesHosted + 1,
              lastHosted: gatheringDate,
              updatedAt: new Date(),
            })
            .where(eq(members.id, newHostId));
        }
      } else if (date && date !== current[0].date) {
        // Update last hosted date if date changed and is more recent
        const member = await ctx.db
          .select({ lastHosted: members.lastHosted })
          .from(members)
          .where(eq(members.id, newHostId))
          .limit(1);

        if (member.length > 0) {
          const shouldUpdate = !member[0].lastHosted || 
            (gatheringDate > member[0].lastHosted);
          
          if (shouldUpdate) {
            await ctx.db
              .update(members)
              .set({
                lastHosted: gatheringDate,
                updatedAt: new Date(),
              })
              .where(eq(members.id, newHostId));
          }
        }
      }

      return result[0];
    }),

  // Delete gathering (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Check if gathering has whiskies
      const { whiskies } = await import("@/db/schema");
      const whiskiesCount = await ctx.db
        .select()
        .from(whiskies)
        .where(eq(whiskies.gatheringId, id))
        .limit(1);

      if (whiskiesCount.length > 0) {
        throw new Error("Cannot delete gathering that has associated whiskies");
      }

      const result = await ctx.db
        .delete(gatherings)
        .where(eq(gatherings.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Gathering not found");
      }

      return { success: true };
    }),
});

