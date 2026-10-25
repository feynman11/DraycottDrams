# Deployment

Draycott Drams is one Cloudflare Worker. It serves the React app as static assets and answers
`/api/*` itself (Hono): tRPC, Better Auth (Google sign-in) and a health check. Data lives in D1,
and the AI sommelier runs on Workers AI through AI Gateway. There are no servers, containers or
external databases.

```
browser ──► Worker draycottdrams ─┬─ static assets (dist/client)   every path except /api/*
                                  └─ Hono  /api/trpc/*   tRPC routers (worker/routers)
                                           /api/auth/*   Better Auth (Google)
                                           /api/health   { service, env, version }
                                           /api/map-key  MapTiler key for the map
                      bindings:  DB → D1      AI → Workers AI, via AI Gateway "draycottdrams"
```

## Environments

| | Worker | D1 database | URL | Deployed by |
|---|---|---|---|---|
| local | `vite dev` (workerd) | `.wrangler/state` | http://localhost:5173 | `pnpm dev` |
| PR preview | version of `draycottdrams-staging`, alias `pr-<n>` | staging | `https://pr-<n>-draycottdrams-staging.tomseagrave94.workers.dev` | `preview.yml`, every push to a PR |
| staging | `draycottdrams-staging` | `draycottdrams-staging` | `https://draycottdrams-staging.tomseagrave94.workers.dev` | `deploy.yml`, every push to `main` |
| production | `draycottdrams` | `draycottdrams` | https://draycottdrams.co.uk (also `https://draycottdrams.tomseagrave94.workers.dev`) | `deploy.yml`, run by hand with target `production` |

- **Previews** are uploaded Worker versions that are never deployed, so staging keeps running
  `main`. They share staging's database and secrets. A PR's migrations reach staging only when it
  merges.
- **Production** deploys need a person: run the *deploy* workflow on `main` with target
  `production`. Add required reviewers to the GitHub environment `production`.
- **Each deploy** builds, applies D1 migrations, deploys with `APP_VERSION=<commit>`, then checks
  `/api/health` reports that commit. Migrations run before the new code, so they must work with the
  code already live: add columns and tables now, and drop old ones in a later release.

## First-time setup

1. **Cloudflare login:** `pnpm exec wrangler login`.
2. **Bootstrap:** run `scripts/bootstrap-cloudflare.sh <workers.dev subdomain>`. The subdomain is
   under *Workers & Pages → Overview*. The script:
   - creates both D1 databases and writes their ids and URLs into `wrangler.jsonc`;
   - deploys both Workers once;
   - sets their secrets (it generates `BETTER_AUTH_SECRET` and asks for the rest);
   - applies the migrations.

   Commit the updated `wrangler.jsonc`.
3. **AI Gateway:** in the dashboard, go to *AI → AI Gateway → Create gateway*, use id
   `draycottdrams`, and turn on caching and rate limiting to taste. Both Workers use it. Logs and
   costs show there. To change model, edit `MODEL` in `worker/routers/ai.ts`.
4. **Google OAuth:** in Google Cloud Console, open *APIs & Services → Credentials → OAuth client
   (Web)* and add these authorised redirect URIs:
   - `https://draycottdrams.tomseagrave94.workers.dev/api/auth/callback/google`
   - `https://draycottdrams-staging.tomseagrave94.workers.dev/api/auth/callback/google`
   - `http://localhost:5173/api/auth/callback/google`

   Previews don't need their own entry, because their sign-in goes through staging (Better Auth's
   OAuth proxy).
5. **GitHub:**
   - Repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token needs
     *Workers Scripts: Edit*, *D1: Edit* and *Account Settings: Read*.
   - Environments: `staging` and `production`.

### Custom domain

Production is served at `draycottdrams.co.uk` (the `routes` entry in `wrangler.jsonc`; Cloudflare
manages its DNS record). The MapTiler key and the Google OAuth client are both tied to that domain.
Before 2026-10-23 the domain was a CNAME to the Cloudflare Tunnel
`d311b940-6741-4f51-a2be-ecbc1f1e927b.cfargotunnel.com` (the old Docker app on hp-server).

To use another custom domain:
1. Add it under *Worker → Settings → Domains & Routes*.
2. Set `APP_URL` in `wrangler.jsonc` to the new address.
3. Add the new redirect URI in Google Cloud Console.

## Moving the data from the old Postgres database

The schema is the same as before, with SQLite types, so the data copies straight across:

```bash
pnpm db:migrate:production                 # empty schema on the production D1
OLD_DATABASE_URL=postgres://… pnpm db:migrate-from-postgres --remote   # see the script's header
```

It refuses to write into tables that already have rows (pass `--force` to replace them), and fails
if the row counts differ. Users keep their ids. The first Google sign-in links each person's Google
account to their existing row, so tastings, admin and member flags carry over.

## Secrets and settings

| Name | Where | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | Worker secret | Signs session cookies. Use a different one per environment. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Worker secret | One OAuth client can serve every environment. |
| `MAPTILER_API_KEY` | Worker secret | Optional. Map tiles. |
| `RESEND_API_KEY` | Worker secret | Sends sign-in link emails from draycottdrams.co.uk (verified in Resend). |
| `APP_URL`, `APP_ENV`, `AI_GATEWAY_ID` | `wrangler.jsonc` vars | Public. |
| `APP_VERSION` | set by CI per deploy | The commit that `/api/health` reports. |

Set or rotate one with `pnpm exec wrangler secret put <NAME> [--env staging] -c wrangler.jsonc`.
Locally, they come from `.dev.vars` (see `.dev.vars.example`).

## Rollback

There are two ways back:
- **Code:** in *Worker → Deployments*, pick an earlier version, or run
  `pnpm exec wrangler rollback [--env staging]`.
- **Data:** D1 Time Travel restores any minute in the last 30 days:
  `pnpm exec wrangler d1 time-travel restore draycottdrams --timestamp <ISO time>`.

## Logs

- **Worker logs:** *Worker → Logs* (observability is on in `wrangler.jsonc`), or
  `pnpm exec wrangler tail [--env staging]`.
- **AI requests:** in AI Gateway.
