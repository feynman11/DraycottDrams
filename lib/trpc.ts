import { initTRPC } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import superjson from "superjson";
import type { NextRequest } from "next/server";

export const createTRPCContext = async (req: NextRequest) => {
  // Get user session
  const session = await getServerSession(authOptions);

  return {
    db,
    session,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new Error("Unauthorized");
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const memberProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.member) {
    throw new Error("Forbidden: Member access required");
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.admin) {
    throw new Error("Forbidden: Admin access required");
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
