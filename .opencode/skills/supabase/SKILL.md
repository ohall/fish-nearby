---
name: supabase
description: Use when working with the Supabase Postgres/PostGIS database — supabase CLI, local dev stack, migrations (Drizzle + SQL), PostGIS spatial queries and indexes, linking the remote project, generated types, seeds, and connection strings.
---

# Supabase

Supabase hosts PostgreSQL + PostGIS for the data model in TODO.md:
`water_body`, `species`, `water_body_species`, `source`, `raw_import`,
`inference` (see docs/deployment.md, docs/todos/05, docs/todos/06).

## CLI

The `supabase` CLI is not installed globally. Use `npx supabase <cmd>` /
`pnpm dlx supabase <cmd>`, or `brew install supabase/tap/supabase`.

Local dev (requires Docker):

- `supabase init` — creates `supabase/config.toml` (once)
- `supabase start` — starts the local stack; prints local API URL, anon/service keys, DB URL
- `supabase status` — show connection details
- `supabase stop`

Link & migrate:

- `supabase login`
- `supabase link --project-ref <ref>`
- `supabase migration new <name>`
- `supabase migration list` — local vs remote status
- `supabase db push` — apply migrations to the LINKED remote (confirm before running against prod)
- `supabase db reset` — LOCAL only: rebuild from migrations + `seed.sql`
- `supabase db diff -f <name>` — generate a migration from local DB changes
- `supabase gen types typescript --local > src/types/supabase.ts`

Direct SQL:

- Local: `psql postgresql://postgres:postgres@localhost:54322/postgres`
- Remote: `psql "$SUPABASE_DB_URL"` (pooled connection string from the dashboard; never commit it)

## Project conventions

- ORM: Drizzle + SQL migrations, checked into Git. Use raw SQL for PostGIS
  functions/indexes when clearer.
- NEVER auto-mutate the production schema on app startup — migrations are
  applied explicitly (docs/todos/06).
- Enable PostGIS in a migration:
  `create extension if not exists postgis with schema extensions;`
- Geography: SRID 4326; use `geography` distance queries in meters. Keep
  spatial logic in SQL, not the browser.
- Add a GiST spatial index on `water_body` geometry for nearby lookups.
- Ingestion (GitHub Actions) writes with a service-role/DB connection; the
  Vercel app uses anon/pooled access only.

## Safety

- Ask before `supabase db push` or any migration against the linked
  (production) project.
- Never commit `.env`, service-role keys, or DB passwords.
- Free-tier projects pause after inactivity — use `supabase start` locally for
  dev, or unpause from the dashboard.
