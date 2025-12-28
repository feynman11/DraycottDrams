import { createTRPCRouter, publicProcedure, adminProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { members, users } from "@/db/schema";
import { eq, ilike, desc } from "drizzle-orm";
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
      const { gatherings } = await import("@/db/schema");
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
});

