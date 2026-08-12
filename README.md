# Fish Nearby

A mobile-friendly web app for answering:

> What public evidence shows which fish species are associated with water bodies
> near me?

## MVP

- Mobile-first map
- Nearby water bodies
- Species per water body
- Public-source provenance
- PostgreSQL/PostGIS
- Deterministic normalization pipeline
- Bounded OpenRouter fallback for ambiguous records

## Docs

- [Implementation plan](docs/implementation-plan.md)
- [TODO / build plan](TODO.md)
- [Implementation guide](docs/README.md)
- [Data model](docs/data-model.md)
- [NY & NJ fishing data sources](docs/data-sources-ny-nj.md)
- [Simple authentication scheme](docs/auth.md)
- [Deployment recommendation](docs/deployment.md)

## Proposed stack

Next.js + TypeScript · MapLibre GL JS · Vercel · Supabase/PostGIS · Drizzle · GitHub Actions · OpenRouter

## Local development

Requirements: Node.js 24, npm 11, Docker, and the Supabase CLI (the npm scripts
can download the CLI through `npx`).

```bash
npm ci
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

The app runs at <http://127.0.0.1:3000>. Supabase's local services and database
connection values are printed by `npm run db:start`. Use the pooled URL for
`DATABASE_URL` and the direct database URL for `DIRECT_DATABASE_URL`. Stop the
local stack with `npm run db:stop`.

The checked-in migration enables PostGIS. Migrations are applied explicitly;
the application never changes database schema during startup. Running migrations
against the linked remote project requires a deliberate `supabase db push` and
is not part of local setup.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

CI runs the same checks with an ephemeral PostGIS database and a mobile Chromium
smoke test. No production credentials are used.
