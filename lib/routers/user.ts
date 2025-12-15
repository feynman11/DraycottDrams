import { createTRPCRouter, protectedProcedure, adminProcedure, memberProcedure } from "@/lib/trpc";
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

  // Get all users (members and admins can view)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is a member or admin
    if (!ctx.session?.user?.member && !ctx.session?.user?.admin) {
      throw new Error("Forbidden: Member or admin access required");
    }
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        admin: users.admin,
        member: users.member,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .orderBy(users.createdAt);

    return result;
  }),

  // Update user member/admin status (admin only)
  updateStatus: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        member: z.boolean().optional(),
        admin: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, member, admin } = input;

      const updateData: { member?: boolean; admin?: boolean; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (member !== undefined) {
        updateData.member = member;
      }

      if (admin !== undefined) {
        updateData.admin = admin;
      }

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (result.length === 0) {
        throw new Error("User not found");
      }

      return result[0];
    }),
});
