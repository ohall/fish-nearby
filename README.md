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
