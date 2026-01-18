# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

DraycottDrams is a full-stack whisky club management system featuring interactive visualization, AI-powered recommendations, and member tracking. Built with Next.js 16 (App Router), React 19, PostgreSQL, and tRPC.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, D3.js, Recharts, MapLibre GL
- **Backend:** tRPC with React Query, Drizzle ORM, PostgreSQL 15+
- **Auth:** NextAuth.js with Google OAuth
- **AI:** Google Gemini 1.5 Flash for sommelier recommendations
- **Runtime:** Bun 1.3.4+

## Common Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run lint         # ESLint check

# Database
bun run db:push      # Push schema changes
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Drizzle Studio GUI
bun run db:seed      # Seed data
```

## Project Structure

```
app/                    # Next.js App Router pages
  api/trpc/[trpc]/      # tRPC endpoint
  api/auth/[...nextauth]/ # NextAuth routes
  map/, library/, members/, distilleries/ # Feature pages
components/             # React components
  ui/                   # shadcn/ui base components
  whisky/, distillery/, member/, ai/, map/ # Feature components
lib/                    # Backend logic
  routers/              # tRPC route handlers (whisky, distillery, gathering, tasting, ai, member, user, import)
  auth.ts               # NextAuth configuration
  db.ts                 # Database connection
  trpc.ts               # tRPC context & procedures
db/
  schema.ts             # Drizzle ORM schema (all tables)
  seed.ts               # Database seeding
```

## Architecture

### tRPC API
- Routers in `lib/routers/` combine into `appRouter` in `lib/routers/app.ts`
- Access levels: `publicProcedure`, `protectedProcedure`, `memberProcedure`, `adminProcedure`
- Client calls: `api.whisky.getAll.useQuery()`, `api.tasting.create.useMutation()`

### Database
Tables: users, members, distilleries, gatherings, whiskies, tastings, tastingNotes

Schema defined with Drizzle ORM in `db/schema.ts`. Zod schemas generated for validation.

### Authentication
Google OAuth via NextAuth.js. JWT strategy. User roles: user (default), member, admin.

## Code Patterns

- Use `"use client"` directive for interactive components
- Path alias `@/` maps to project root
- Validate inputs with Zod schemas
- Use Drizzle query operators: `eq`, `ilike`, `and`, `or`, `sql`
- shadcn/ui components in `components/ui/`
- Icons from Lucide React

## Environment Variables

Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`

Optional: `MAPTILER_API_KEY`, `APP_URL`

## Adding Features

**New page:** Create `app/yourpage/page.tsx`, add to navigation in Header component

**New API endpoint:** Add procedure to `lib/routers/`, register in `appRouter`

**New table:** Add to `db/schema.ts`, run `bun run db:generate && bun run db:push`
