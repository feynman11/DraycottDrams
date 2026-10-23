import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/worker/trpc";
import { tastings, tastingNotes, whiskies, users, distilleries, gatherings } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/worker/db";

// D1 allows at most 100 bound parameters per statement; a note row binds 5 (id, tasting_id,
// note, intensity, created_at), so insert in chunks of 19.
const NOTE_CHUNK = 19;

const noteInserts = (db: Db, tastingId: string, notes: { note: string; intensity: number }[]) => {
  const statements = [];
  for (let i = 0; i < notes.length; i += NOTE_CHUNK) {
    statements.push(
      db.insert(tastingNotes).values(
        notes.slice(i, i + NOTE_CHUNK).map(note => ({
          tastingId,
          note: note.note,
          intensity: note.intensity,
        }))
      )
    );
  }
  return statements;
};

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

      // D1 has no interactive transactions, so generate the id up front and write the tasting
      // and its notes in one atomic batch.
      const tastingId = crypto.randomUUID();
      const [tastingResult] = await ctx.db.batch([
        ctx.db
          .insert(tastings)
          .values({
            id: tastingId,
            userId: session.user.id,
            whiskyId,
            rating,
            notes,
            tastingDate,
          })
          .returning(),
        ...noteInserts(ctx.db, tastingId, notesArray ?? []),
      ]);

      const tasting = tastingResult[0];

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
      const tastingResult = await ctx.db
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
        // Replace existing notes atomically
        await ctx.db.batch([
          ctx.db.delete(tastingNotes).where(eq(tastingNotes.tastingId, id)),
          ...noteInserts(ctx.db, id, notesArray),
        ]);
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

      // Only the owner's tasting matches; its notes go with it (tasting_notes ON DELETE CASCADE,
      // enforced by D1). Deleting notes first, unguarded, let anyone wipe another user's notes.
      const result = await ctx.db
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
        gatheringId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const { limit = 20, offset = 0, gatheringId } = input || {};

      const conditions = [eq(tastings.userId, session.user.id)];
      if (gatheringId) {
        conditions.push(eq(whiskies.gatheringId, gatheringId));
      }

      const result = await ctx.db
        .select({
          tasting: tastings,
          whisky: {
            id: whiskies.id,
            name: whiskies.name,
            variety: whiskies.variety,
            distillery: distilleries.name,
            region: distilleries.region,
          },
          gathering: {
            id: gatherings.id,
            number: gatherings.number,
            date: gatherings.date,
            theme: gatherings.theme,
          },
        })
        .from(tastings)
        .innerJoin(whiskies, eq(tastings.whiskyId, whiskies.id))
        .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
        .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
        .where(and(...conditions))
        .orderBy(
          // Dates are ms epoch integers; ordering by ms distance from now matches the old seconds-based sort.
          sql`ABS(${gatherings.date} - (unixepoch('subsec') * 1000)) ASC`,
          desc(tastings.tastingDate)
        )
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
    .query(async ({ ctx, input }) => {
      const { whiskyId, limit } = input;

      const result = await ctx.db
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
