# Data model

The Phase 1 PostgreSQL/PostGIS model is implemented by
[`20260813000000_core_schema.sql`](../supabase/migrations/20260813000000_core_schema.sql).
That migration is the schema source of truth; the matching Drizzle declarations
live in [`src/server/db/schema.ts`](../src/server/db/schema.ts).

## Pipeline and lineage

```text
source ──< ingestion_run ──< raw_import ──< inference
  │                 │             │
  │                 │             └──────────────┐
  │                 │                            │
  │                 └──< water_body_source >── water_body
  │                                              │
  └──< water_body_species >── species            │
             │                 └──< species_alias│
             ├──< review_decision                │
             └───────────────────────────────────┘
```

- `source` registers an upstream dataset and points to its current published
  run.
- `ingestion_run` distinguishes full and incremental snapshots and records
  lifecycle state, watermark, version, and processing counts.
- `raw_import` is an append-only record of the original JSON. Its identity is
  source + stable artifact key + canonical SHA-256 hash, so changed versions are
  replayable without collapsing distinct upstream records.
- `water_body_source` maps a stable upstream identity to a canonical water body
  and records raw/run lineage, confidence, review state, and retirement.
- `water_body` stores the MVP representative point as `geometry(Point, 4326)`.
- `species` and `species_alias` provide source-neutral fish identities and
  source-scoped aliases where needed.
- `water_body_species` is an evidence ledger, not a deduplicated presence join.
  Every row has a stable source evidence key, claim type, extraction method,
  confidence tier, review state, dates, raw lineage, run lineage, and retirement
  state.
- `inference` is an append-only cache and audit record keyed by task, provider,
  model, prompt version, and canonical input hash.
- `review_decision` is an append-only transition log naming its rule,
  correction, or reviewer actor.

## Public boundary

The application read role has access only to two projections:

- `public_water_body` includes canonical waters with an active, accepted source
  mapping.
- `public_water_body_evidence` includes active, accepted evidence with only the
  species, source, dates, claim type, and confidence fields safe for anonymous
  responses.

The read role cannot select base tables or write data. It therefore cannot see
raw payloads, inference records, ingestion internals, review history, or
retired/rejected evidence. The job role receives the minimum base-table grants
needed for ingestion; append-only tables have no update/delete grant and also
reject mutation with database triggers.

Row-level security is enabled on every base table as defense in depth. The
server uses the narrow public views through a dedicated data-access layer; the
browser never queries Supabase tables directly.

## Spatial query

Nearby reads consistently cast the stored point to geography so radii and
distances are measured in meters:

```sql
extensions.st_dwithin(
  geom::extensions.geography,
  extensions.st_setsrid(
    extensions.st_makepoint(:longitude, :latitude),
    4326
  )::extensions.geography,
  :radius_meters
)
```

`water_body_geography_gist` indexes that exact `geom::geography` expression.
The integration suite runs the public-view query through `EXPLAIN (FORMAT JSON)`
and fails unless PostgreSQL selects that index.

## Evidence semantics

Evidence types describe what the source claims:

- `agency_recommended_presence`
- `agency_listed_presence`
- `stocking`
- `survey`
- `report`

Extraction methods separately describe how the claim was obtained:

- `structured_source`
- `deterministic_document`
- `llm_document`

Confidence (`high`, `medium`, `low`) describes the quality of entity mapping,
not the probability of finding or catching a fish. Only `accepted` evidence is
public; `review` and `rejected` records remain internal.

## Verification

[`core-schema.sql`](../tests/integration/core-schema.sql) verifies the fresh
migration and seed against PostgreSQL 17/PostGIS, including:

- role grants and private base tables;
- accepted-only public projections;
- content-addressed uniqueness and append-only enforcement;
- coordinate/SRID constraints and meter-based distance behavior; and
- index selection for the nearby query expression.

CI applies migrations in order, seeds the pilot source/species set, and runs
both database integration scripts before building the app.
