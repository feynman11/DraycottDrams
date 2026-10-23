# Environment

## Local development

Needs mise, or Node 26.10 and pnpm 12.6 (pinned in `mise.toml`). No Docker and no database server
are needed.

```bash
pnpm install
cp .dev.vars.example .dev.vars   # then fill in the values below
pnpm db:migrate:local            # create the local D1 database (.wrangler/state)
pnpm db:seed                     # optional sample data
pnpm dev                         # http://localhost:5173: app and Worker together, hot reload
```

`pnpm dev` runs the real Worker in workerd, with local D1, and works offline. Workers AI only runs on
Cloudflare, so the AI sommelier needs `pnpm exec wrangler login` and then `pnpm dev:ai`.

## `.dev.vars`

| Name | Required | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | yes | Generate it with `openssl rand -base64 32`. |
| `APP_URL` | yes | `http://localhost:5173` |
| `APP_ENV` | no | `development` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for sign-in | Register `http://localhost:5173/api/auth/callback/google` with Google. |
| `MAPTILER_API_KEY` | no | Map tiles. |

Deployed values and how to set them: [DEPLOYMENT.md](DEPLOYMENT.md#secrets-and-settings).

## Changing the schema

1. Edit `db/schema.ts`.
2. Run `pnpm db:generate` to write a new SQL file in `db/migrations`, and commit it.
3. Run `pnpm db:migrate:local`.

CI fails a PR whose schema and migrations disagree (`pnpm db:check`). Staging and production apply
new migrations on deploy.

After changing `wrangler.jsonc` (bindings or vars), run `pnpm cf-typegen` to regenerate
`worker/worker-configuration.d.ts`, the `Env` type.
