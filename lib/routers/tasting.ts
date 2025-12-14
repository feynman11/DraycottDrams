import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { tastings, tastingNotes, whiskies, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

export const tastingRouter = createTRPCRouter({
  // Create a new tasting
  create: protectedProcedure
    .input(
      z.object({
        whiskyId: z.string(),
        rating: z.number().min(1).max(5),
        notes: z.string().optional(),
        tastingDate: z.date(),
        tastingNotes: z.array(
          z.object({
            note: z.string(),
            intensity: z.number().min(1).max(5),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const { whiskyId, rating, notes, tastingDate, tastingNotes: notesArray } = input;

      // Create the tasting
      const tastingResult = await db
        .insert(tastings)
        .values({
          userId: session.user.id,
          whiskyId,
          rating,
          notes,
          tastingDate,
        })
        .returning();

      const tasting = tastingResult[0];

      // Create tasting notes if provided
      if (notesArray && notesArray.length > 0) {
        await db.insert(tastingNotes).values(
          notesArray.map(note => ({
            tastingId: tasting.id,
            note: note.note,
            intensity: note.intensity,
          }))
        );
      }

      return tasting;
    }),

  // Update an existing tasting
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        rating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
        tastingDate: z.date().optional(),
        tastingNotes: z.array(
          z.object({
            note: z.string(),
            intensity: z.number().min(1).max(5),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const { id, tastingNotes: notesArray, ...updateData } = input;

      // Update the tasting
      const tastingResult = await db
        .update(tastings)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(tastings.id, id), eq(tastings.userId, session.user.id)))
        .returning();

      if (tastingResult.length === 0) {
        throw new Error("Tasting not found or unauthorized");
      }

      const tasting = tastingResult[0];

      // Update tasting notes if provided
      if (notesArray) {
        // Delete existing notes
        await db.delete(tastingNotes).where(eq(tastingNotes.tastingId, id));

        // Insert new notes
        if (notesArray.length > 0) {
          await db.insert(tastingNotes).values(
            notesArray.map(note => ({
              tastingId: id,
              note: note.note,
              intensity: note.intensity,
            }))
          );
        }
      }

      return tasting;
    }),

  // Delete a tasting
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const { id } = input;

      // Delete tasting notes first (cascade should handle this, but being explicit)
      await db.delete(tastingNotes).where(eq(tastingNotes.tastingId, id));

      // Delete the tasting
      const result = await db
        .delete(tastings)
        .where(and(eq(tastings.id, id), eq(tastings.userId, session.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Tasting not found or unauthorized");
      }

      return { success: true };
    }),

  // Get user's tastings
  getUserTastings: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(1000),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const { limit = 20, offset = 0 } = input || {};

      const result = await db
        .select({
          tasting: tastings,
          whisky: {
            id: whiskies.id,
            name: whiskies.name,
            distillery: whiskies.distillery,
            region: whiskies.region,
          },
        })
        .from(tastings)
        .innerJoin(whiskies, eq(tastings.whiskyId, whiskies.id))
        .where(eq(tastings.userId, session.user.id))
        .orderBy(desc(tastings.tastingDate))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Get tastings for a specific whisky
  getByWhisky: publicProcedure
    .input(
      z.object({
        whiskyId: z.string(),
          limit: z.number().min(1).max(1000).default(1000),
      })
    )
    .query(async ({ input }) => {
      const { whiskyId, limit } = input;

      const result = await db
        .select({
          tasting: tastings,
          user: {
            id: users.id,
            name: users.name,
          },
        })
        .from(tastings)
        .innerJoin(users, eq(tastings.userId, users.id))
        .where(eq(tastings.whiskyId, whiskyId))
        .orderBy(desc(tastings.tastingDate))
        .limit(limit);

      return result;
    }),
});
