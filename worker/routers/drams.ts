import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/worker/trpc";
import { distilleries, gatherings, members, whiskies } from "@/db/schema";
import { dramsSheetRowSchema } from "@/lib/drams-sheet";
import { applyImport, planImport } from "@/worker/drams-import";
import { applySuggestions, DISTILLERY_FIELDS, reviewData, WHISKY_FIELDS } from "@/worker/data-review";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

// The members' area is open to members and admins (an admin need not be a member)
const memberOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.user.member && !ctx.session.user.admin) {
    throw new Error("Forbidden: Member access required");
  }
  return next();
});

const sheetRows = z.array(dramsSheetRowSchema).min(1).max(5000);

const distilleryChoice = z.union([
  z.object({ distilleryId: z.string().min(1) }),
  z.object({
    create: z.object({
      name: z.string().trim().min(1).max(200),
      country: z.string().trim().max(100),
      region: z.string().trim().max(100),
    }),
  }),
]);

export const dramsRouter = createTRPCRouter({
  // Every dram on the site, in the chair's sheet layout
  getSheet: memberOrAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: whiskies.id,
        gathering: gatherings.number,
        theme: gatherings.theme,
        date: gatherings.date,
        provider: whiskies.provider,
        country: distilleries.country,
        region: distilleries.region,
        distillery: distilleries.name,
        variety: whiskies.variety,
        abv: whiskies.abv,
        host: members.name,
        ranking: whiskies.ranking,
        notes: whiskies.notes,
      })
      .from(whiskies)
      .innerJoin(gatherings, eq(whiskies.gatheringId, gatherings.id))
      .innerJoin(distilleries, eq(whiskies.distilleryId, distilleries.id))
      .leftJoin(members, eq(gatherings.hostId, members.id))
      .orderBy(asc(gatherings.number), asc(whiskies.ranking), asc(distilleries.name));
    return rows;
  }),

  // Compare an uploaded sheet with the site; writes nothing
  previewImport: adminProcedure
    .input(z.object({ rows: sheetRows, useAi: z.boolean().default(true), choices: z.record(z.string(), distilleryChoice).optional() }))
    .mutation(({ ctx, input }) => planImport(ctx.db, ctx.env, input.rows, { useAi: input.useAi, choices: input.choices })),

  // Apply a previewed sheet; `choices` holds the (possibly edited) distillery match for every sheet name
  applyImport: adminProcedure
    .input(z.object({ rows: sheetRows, choices: z.record(z.string(), distilleryChoice) }))
    .mutation(({ ctx, input }) => applyImport(ctx.db, ctx.env, input.rows, input.choices)),

  // One page of AI suggestions for the chosen part of the data
  review: adminProcedure
    .input(z.object({ scope: z.enum(["distilleries", "whiskies", "duplicates"]), offset: z.number().int().min(0).default(0) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reviewData(ctx.db, ctx.env, input.scope, input.offset);
      } catch (error) {
        console.error("AI data review failed:", error);
        throw new Error("The AI review is unavailable right now (locally, run pnpm dev:ai).");
      }
    }),

  applySuggestions: adminProcedure
    .input(
      z.object({
        items: z
          .array(
            z.union([
              z.object({ kind: z.literal("update"), entity: z.literal("distillery"), targetId: z.string(), field: z.enum(DISTILLERY_FIELDS), value: z.string().max(600) }),
              z.object({ kind: z.literal("update"), entity: z.literal("whisky"), targetId: z.string(), field: z.enum(WHISKY_FIELDS), value: z.string().max(200) }),
              z.object({ kind: z.literal("merge"), keepId: z.string(), removeId: z.string() }),
            ]),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(({ ctx, input }) => applySuggestions(ctx.db, input.items)),
});
