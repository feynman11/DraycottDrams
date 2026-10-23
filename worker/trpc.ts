import { initTRPC } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import superjson from "superjson";
import { createAuth } from "@/worker/auth";
import { createDb } from "@/worker/db";

export const createTRPCContext = async (c: HonoContext<{ Bindings: Env }>) => {
  const db = createDb(c.env.DB);
  // Read from D1 on every request, so admin/member changes apply at once.
  const result = await createAuth(c.env, db).api.getSession({ headers: c.req.raw.headers });

  return {
    db,
    env: c.env,
    session: result ? { user: result.user } : null,
  };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
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
