# Data Model

Proposed schema for the MVP. PostgreSQL + PostGIS, migrated via Drizzle.

Pipeline shape: **source → raw_import → inference → water_body / species → water_body_species**.

```text
source ──< raw_import ──< inference
  │              │
  │              │ (normalized into)
  │              ▼
  │        water_body ──< water_body_species >── species ──< species_alias
  └──────────────────────────^
app_user (reviewers/admins only, see auth.md)
```

## Schema

```sql
create extension if not exists postgis;

-- Enums ---------------------------------------------------------------------

create type water_body_type as enum
  ('lake', 'pond', 'reservoir', 'river', 'stream', 'unknown');

-- keep semantics explicit per data-sources-ny-nj.md
create type evidence_type as enum
  ('agency_recommended_presence', 'agency_listed_presence',
   'stocking', 'survey', 'report', 'inferred_from_document');

create type review_state as enum ('accepted', 'review', 'rejected');

create type confidence_tier as enum ('high', 'medium', 'low');

-- Source registry (todo 10) --------------------------------------------------

create table source (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  agency          text not null,                 -- e.g. 'NJ Fish & Wildlife'
  state           char(2) not null,              -- 'NJ' | 'NY'
  url             text not null,
  source_type     text not null,                 -- 'arcgis' | 'socrata' | 'pdf' | 'web'
  refresh_cadence text,                          -- e.g. 'monthly', 'annual'
  license_notes   text,
  quality_weight  numeric,                       -- only if ranking needs it later
  created_at      timestamptz not null default now()
);

-- Immutable raw artifacts (todos 11, 19, 20) ---------------------------------

create table raw_import (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references source(id),
  external_id  text,                             -- upstream record ID (e.g. ArcGIS ID)
  fetched_at   timestamptz not null default now(),
  content_hash text not null,                    -- sha256 of canonical payload
  payload      jsonb not null,
  unique (source_id, content_hash)               -- content-addressed → idempotent ingest
);

-- LLM cache / audit (todos 12, 26) -------------------------------------------

create table inference (
  id                uuid primary key default gen_random_uuid(),
  raw_import_id     uuid references raw_import(id),
  task              text not null,               -- 'extract_water_body' | 'normalize_species' | 'resolve_water_body'
  model             text not null,               -- e.g. 'openai/gpt-4o-mini'
  prompt_version    text not null,
  input_hash        text not null,
  output            jsonb,
  validation_status text not null default 'pending'
                    check (validation_status in ('pending', 'valid', 'invalid')),
  created_at        timestamptz not null default now(),
  unique (task, model, prompt_version, input_hash)  -- cache key; never overwrite
);

-- Canonical water bodies (todo 07) -------------------------------------------

create table water_body (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         water_body_type not null default 'unknown',
  state        char(2) not null,
  county       text,
  geom         geometry(Point, 4326) not null,   -- MVP: point; upgrade to MultiPolygon later
  external_ids jsonb not null default '{}',      -- {"nj_gfch": "123", "ny_socrata": "..."}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index water_body_geom_gist on water_body using gist (geom);          -- todo 16
create index water_body_state_name_idx on water_body (state, lower(name));  -- candidate generation (todo 25)

-- Canonical species (todo 08) ------------------------------------------------

create table species (
  id              uuid primary key default gen_random_uuid(),
  common_name     text not null unique,          -- 'Largemouth Bass'
  scientific_name text unique                    -- 'Micropterus salmoides'
);

create table species_alias (
  id         uuid primary key default gen_random_uuid(),
  species_id uuid not null references species(id),
  alias      text not null unique                -- 'LMB', 'large mouth bass', ...
);

-- Evidence join (todos 09, 15, 28) -------------------------------------------

create table water_body_species (
  id               uuid primary key default gen_random_uuid(),
  water_body_id    uuid not null references water_body(id),
  species_id       uuid not null references species(id),
  source_id        uuid not null references source(id),
  raw_import_id    uuid references raw_import(id),  -- provenance back to raw payload
  inference_id     uuid references inference(id),   -- provenance back to LLM output, when used
  evidence_type    evidence_type not null,
  observed_at      date,                            -- stocking/survey date; null for presence lists
  confidence_score numeric check (confidence_score between 0 and 1),
  confidence_tier  confidence_tier not null,        -- what the API exposes
  review_state     review_state not null default 'review',
  created_at       timestamptz not null default now()
);

-- multiple evidence rows allowed, but no duplicates (treats null observed_at as equal)
create unique index water_body_species_dedupe on water_body_species
  (water_body_id, species_id, source_id, evidence_type, coalesce(observed_at, date '0001-01-01'));

create index wbs_water_idx on water_body_species (water_body_id) where review_state = 'accepted';
```

`app_user` stays as defined in [auth.md](auth.md). Reviewers mutate `review_state`; the anonymous role reads only `accepted` rows (enforced via RLS).

## Design decisions

1. **Evidence, not presence.** `water_body_species` rows are dated claims with provenance. A 2019 stocking and a 2025 survey coexist as separate rows; the API aggregates them into one species list with the best tier (todo 15). This implements "keep stocking separate from surveys/presence lists" (todo 09).
2. **Full provenance chain.** Every normalized row traces back: `water_body_species → raw_import → source`, and `→ inference` when the LLM was involved. Failed or improved normalization stays replayable (todo 11), and the inference cache controls repeat-normalization cost (see deployment.md).
3. **Idempotency via constraints, not code.** `unique(source_id, content_hash)` on `raw_import` and the dedupe index on `water_body_species` let ingestion blindly `insert ... on conflict do nothing` (todo 21).
4. **Deterministic confidence.** `confidence_tier` is computed by rules (source quality + match type, todo 28), stored so API reads are plain queries, and `review_state` gates what the public API returns.
5. **Point geometry for MVP.** Per todo 07 ("start with point geometry if necessary"), `geometry(Point, 4326)` keeps the nearby query (`ST_DWithin` over the GiST index) trivial. Polygons from the NJ layers can be added later as a nullable `geom_poly geometry(MultiPolygon, 4326)` without breaking anything.

## Serving the API

- `GET /waters?lat=&lng=&radius=` → `ST_DWithin(geom::geography, ST_MakePoint(:lng, :lat)::geography, :radius)` over `water_body_geom_gist` (todos 13, 16).
- `GET /waters/:id` → water body plus its `accepted` `water_body_species` rows joined to `species` and `source`, returning `confidence_tier`, `evidence_type`, `observed_at`, and source name/URL per the DTO contract (todos 14, 15).
