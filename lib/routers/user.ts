import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const userRouter = createTRPCRouter({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (result.length === 0) {
      throw new Error("User not found");
    }

    return result[0];
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      const result = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id))
        .returning();

      return result[0];
    }),
});
