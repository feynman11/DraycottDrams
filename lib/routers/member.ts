import { createTRPCRouter, publicProcedure, adminProcedure, memberProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { members, users, whiskies, distilleries, gatherings } from "@/db/schema";
import { eq, ilike, desc, sql } from "drizzle-orm";
import { z } from "zod";

export const memberRouter = createTRPCRouter({
  // Get all members
  getAll: publicProcedure.query(async () => {
    const result = await db
      .select({
        id: members.id,
        name: members.name,
        userId: members.userId,
        timesHosted: members.timesHosted,
        lastHosted: members.lastHosted,
        createdAt: members.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
        },
      })
      .from(members)
      .leftJoin(users, eq(members.userId, users.id))
      .orderBy(desc(members.timesHosted), members.name);

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      userId: row.userId,
      timesHosted: row.timesHosted,
      lastHosted: row.lastHosted,
      createdAt: row.createdAt,
      user: row.user || null,
    }));
  }),

  // Get member by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;

      const result = await db
        .select({
          id: members.id,
          name: members.name,
          userId: members.userId,
          timesHosted: members.timesHosted,
          lastHosted: members.lastHosted,
          createdAt: members.createdAt,
          user: {
            id: users.id,
            email: users.email,
            name: users.name,
            image: users.image,
          },
        })
        .from(members)
        .leftJoin(users, eq(members.userId, users.id))
        .where(eq(members.id, id))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Member not found");
      }

      const row = result[0];
      return {
        id: row.id,
        name: row.name,
        userId: row.userId,
        timesHosted: row.timesHosted,
        lastHosted: row.lastHosted,
        createdAt: row.createdAt,
        user: row.user || null,
      };
    }),

  // Get or create member by name (for import)
  getOrCreateByName: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { name } = input;
      const normalizedName = name.trim();

      // Check if member exists (case-insensitive)
      const existing = await db
        .select()
        .from(members)
        .where(ilike(members.name, normalizedName))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new member
      const newMember = await db
        .insert(members)
        .values({
          name: normalizedName,
        })
        .returning();

      return newMember[0];
    }),

  // Create member (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .insert(members)
        .values({
          name: input.name.trim(),
          userId: input.userId || undefined,
        })
        .returning();

      return result[0];
    }),

  // Update member (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        userId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db
        .update(members)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(members.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Member not found");
      }

      return result[0];
    }),

  // Delete member (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;

      // Check if member has hosted gatherings
      const gatheringsCount = await db
        .select()
        .from(gatherings)
        .where(eq(gatherings.hostId, id))
        .limit(1);

      if (gatheringsCount.length > 0) {
        throw new Error("Cannot delete member that has hosted gatherings");
      }

      const result = await db
        .delete(members)
        .where(eq(members.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Member not found");
      }

      return { success: true };
    }),

  // Get current user's member profile
  getMyProfile: memberProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Find member linked to this user
    const result = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  }),

  // Get member's contributions (whiskies they provided) and results
  getMyResults: memberProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Find member linked to this user
    const memberResult = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (memberResult.length === 0) {
      return {
        member: null,
        contributions: [],
        stats: {
          totalContributions: 0,
          wins: 0,
          podiums: 0,
          avgRanking: null,
          gatheringsProvided: 0,
        },
      };
    }

    const member = memberResult[0];

    // Get whiskies where provider matches member name (case-insensitive)
    const contributions = await db
      .select({
        id: whiskies.id,
        provider: whiskies.provider,
        variety: whiskies.variety,
        abv: whiskies.abv,
        notes: whiskies.notes,
        ranking: whiskies.ranking,
        distillery: distilleries.name,
        country: distilleries.country,
        region: distilleries.region,
        gatheringNumber: gatherings.number,
        gatheringDate: gatherings.date,
        gatheringTheme: gatherings.theme,
      })
      .from(whiskies)
      .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
      .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
      .where(ilike(whiskies.provider, member.name))
      .orderBy(desc(gatherings.number));

    // Calculate stats
    const totalContributions = contributions.length;
    const wins = contributions.filter(c => c.ranking === 1).length;
    const podiums = contributions.filter(c => c.ranking !== null && c.ranking <= 3).length;
    const rankedContributions = contributions.filter(c => c.ranking !== null);
    const avgRanking = rankedContributions.length > 0
      ? rankedContributions.reduce((sum, c) => sum + (c.ranking || 0), 0) / rankedContributions.length
      : null;
    const gatheringsProvided = new Set(contributions.map(c => c.gatheringNumber)).size;

    // Get gatherings hosted
    const hostedGatherings = await db
      .select({
        id: gatherings.id,
        number: gatherings.number,
        date: gatherings.date,
        theme: gatherings.theme,
      })
      .from(gatherings)
      .where(eq(gatherings.hostId, member.id))
      .orderBy(desc(gatherings.number));

    return {
      member: {
        id: member.id,
        name: member.name,
        timesHosted: member.timesHosted,
        lastHosted: member.lastHosted,
      },
      contributions,
      hostedGatherings,
      stats: {
        totalContributions,
        wins,
        podiums,
        avgRanking: avgRanking ? parseFloat(avgRanking.toFixed(2)) : null,
        gatheringsProvided,
      },
    };
  }),

  // Get results for a specific member by name (public)
  getResultsByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const { name } = input;

      // Find member
      const memberResult = await db
        .select()
        .from(members)
        .where(ilike(members.name, name))
        .limit(1);

      const member = memberResult.length > 0 ? memberResult[0] : null;

      // Get whiskies where provider matches name (case-insensitive)
      const contributions = await db
        .select({
          id: whiskies.id,
          provider: whiskies.provider,
          variety: whiskies.variety,
          abv: whiskies.abv,
          notes: whiskies.notes,
          ranking: whiskies.ranking,
          distillery: distilleries.name,
          country: distilleries.country,
          region: distilleries.region,
          gatheringNumber: gatherings.number,
          gatheringDate: gatherings.date,
          gatheringTheme: gatherings.theme,
        })
        .from(whiskies)
        .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
        .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
        .where(ilike(whiskies.provider, name))
        .orderBy(desc(gatherings.number));

      // Calculate stats
      const totalContributions = contributions.length;
      const wins = contributions.filter(c => c.ranking === 1).length;
      const podiums = contributions.filter(c => c.ranking !== null && c.ranking <= 3).length;
      const rankedContributions = contributions.filter(c => c.ranking !== null);
      const avgRanking = rankedContributions.length > 0
        ? rankedContributions.reduce((sum, c) => sum + (c.ranking || 0), 0) / rankedContributions.length
        : null;
      const gatheringsProvided = new Set(contributions.map(c => c.gatheringNumber)).size;

      // Get gatherings hosted (if member exists)
      let hostedGatherings: { id: string; number: number; date: Date; theme: string | null }[] = [];
      if (member) {
        hostedGatherings = await db
          .select({
            id: gatherings.id,
            number: gatherings.number,
            date: gatherings.date,
            theme: gatherings.theme,
          })
          .from(gatherings)
          .where(eq(gatherings.hostId, member.id))
          .orderBy(desc(gatherings.number));
      }

      return {
        member: member ? {
          id: member.id,
          name: member.name,
          timesHosted: member.timesHosted,
          lastHosted: member.lastHosted,
        } : null,
        contributions,
        hostedGatherings,
        stats: {
          totalContributions,
          wins,
          podiums,
          avgRanking: avgRanking ? parseFloat(avgRanking.toFixed(2)) : null,
          gatheringsProvided,
        },
      };
    }),
});


