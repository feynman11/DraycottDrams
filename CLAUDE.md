# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

DraycottDrams is a full-stack whisky club management system featuring interactive visualization, AI-powered recommendations, and member tracking. One Cloudflare Worker serves a React single-page app and a tRPC API, with data in D1.

## Tech Stack

- **Frontend:** Vite, React 19, TanStack Router, Tailwind CSS 4, shadcn/ui, D3.js, Recharts, MapLibre GL
- **Backend:** Cloudflare Workers, Hono, tRPC with React Query, Drizzle ORM, Cloudflare D1 (SQLite)
- **Auth:** Better Auth with Google OAuth (sessions in D1)
- **AI:** Workers AI (gpt-oss-120b) through Cloudflare AI Gateway; signed-in users only
- **Tooling:** Node 26 + pnpm 12 (pinned in `mise.toml`), wrangler, `@cloudflare/vite-plugin`

## Common Commands

```bash
pnpm dev                 # App + Worker on http://localhost:5173 (local D1; AI offline)
pnpm dev:ai              # Same, with the remote AI binding (needs wrangler login)
pnpm build               # Production build (CLOUDFLARE_ENV=staging for staging)
pnpm typecheck           # tsc over app, worker, db and scripts

# Database (D1)
pnpm db:generate         # SQL migration from db/schema.ts changes → db/migrations
pnpm db:check            # Fails if schema and migrations disagree (CI runs it)
pnpm db:migrate:local    # Apply migrations to the local D1
pnpm db:seed             # Seed data (local by default)
pnpm cf-typegen          # Regenerate worker/worker-configuration.d.ts after wrangler.jsonc changes
```

Deploys happen from CI only (`.github/workflows/deploy.yml`, `preview.yml`). See `docs/DEPLOYMENT.md`.

## Project Structure

```
src/                    # Browser app
  main.tsx              # Entry: providers, router
  router.tsx            # TanStack Router route tree
  pages/                # One file per route (map, library, members, distilleries, winners, signin)
components/             # React components
  ui/                   # shadcn/ui base components
  whisky/, distillery/, member/, ai/, admin/, layout/
lib/                    # Code shared by app and Worker (must stay browser-safe), plus
  auth-client.ts        #   Better Auth client
  trpc-client.ts        #   tRPC React client
worker/                 # Cloudflare Worker (server)
  index.ts              # Hono app: /api/trpc, /api/auth, /api/health, /api/map-key
  trpc.ts               # tRPC context ({ db, env, session }) & procedures
  auth.ts               # Better Auth config
  db.ts                 # Drizzle over the D1 binding
  routers/              # tRPC routers (whisky, distillery, gathering, tasting, ai, member, user, drams)
  drams-import.ts       # Drams sheet upload: preview (exact/fuzzy/AI distillery matching) and apply
  data-review.ts        # AI review of site data → suggestions an admin accepts
db/
  schema.ts             # Drizzle schema (sqlite-core), including Better Auth tables
  migrations/           # Generated SQL, applied by wrangler
scripts/                # Node scripts (seed/import) that reach D1 via wrangler
wrangler.jsonc          # Worker config: production at top level, env.staging for staging + previews
```

## Architecture

### Worker
`wrangler.jsonc` sends only `/api/*` to the Worker (`run_worker_first`); every other path is a static asset with SPA fallback to `index.html`. Bindings are typed as the global `Env` (`worker/worker-configuration.d.ts`, generated).

### tRPC API
- Routers in `worker/routers/` combine into `appRouter` in `worker/routers/app.ts`
- Access levels: `publicProcedure`, `protectedProcedure`, `memberProcedure`, `adminProcedure`
- Always use `ctx.db` and `ctx.env` (per request); there is no global db
- Client calls: `api.whisky.getAll.useQuery()`, `api.tasting.create.useMutation()`

### Database (D1 / SQLite)
Tables: users, sessions, accounts, verifications (Better Auth), members, distilleries, gatherings, whiskies, tastings, tasting_notes.
- Timestamps are integer milliseconds (`mode: "timestamp_ms"` ↔ JS `Date`); raw SQL uses `strftime(..., col / 1000, 'unixepoch')`
- `abv` is a decimal string; `CAST(abv AS REAL)` in SQL
- No interactive transactions: use `db.batch([...])`
- At most 100 bound parameters per statement: chunk bulk inserts and `inArray`

### Authentication
Better Auth, Google only. `users` is Better Auth's user model with extra fields `role`, `admin`, `member`, `lastLogin` (set server-side only). Sessions are read from D1 on every request, so role changes apply immediately. Staging and PR previews use the OAuth proxy plugin, so Google sign-in on previews goes through the staging URL.

## Code Patterns

- Path alias `@/` maps to project root
- Validate inputs with Zod schemas
- Use Drizzle query operators: `eq`, `like` (case-insensitive in SQLite), `and`, `or`, `sql`
- Client code imports from `worker/` only with `import type`
- shadcn/ui components in `components/ui/`
- Icons from Lucide React

## Environment Variables

Local: `.dev.vars` (see `.dev.vars.example`). Deployed: Worker secrets `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MAPTILER_API_KEY`; vars `APP_URL`, `APP_ENV`, `AI_GATEWAY_ID`, `APP_VERSION` in `wrangler.jsonc`.

## Adding Features

**New page:** Create `src/pages/yourpage.tsx`, add a route in `src/router.tsx`, add to navigation in the Header component

**New API endpoint:** Add procedure to `worker/routers/`, register in `appRouter`

**New table/column:** Edit `db/schema.ts`, run `pnpm db:generate && pnpm db:migrate:local`, commit the migration
