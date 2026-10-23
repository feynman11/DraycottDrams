import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { createAuth } from "@/worker/auth";
import { createDb } from "@/worker/db";
import { appRouter } from "@/worker/routers/app";
import { createTRPCContext } from "@/worker/trpc";

// The Worker only sees /api/* (wrangler.jsonc run_worker_first); everything else is static assets.
const app = new Hono<{ Bindings: Env }>();

// Smoke tests check `version` is the commit CI just deployed (wrangler deploy --var APP_VERSION:…).
app.get("/api/health", (c) =>
  c.json({ service: "draycottdrams", env: c.env.APP_ENV, version: c.env.APP_VERSION ?? "dev" }),
);

app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, createDb(c.env.DB)).handler(c.req.raw));

// MapTiler's key is used by the browser anyway; served here so it isn't baked into the build.
app.get("/api/map-key", (c) => c.json({ apiKey: c.env.MAPTILER_API_KEY ?? "" }));

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext: (_opts, c) => createTRPCContext(c),
    onError: ({ error, path }) => {
      console.error(`tRPC error on '${path}':`, error);
    },
  }),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app satisfies ExportedHandler<Env>;
