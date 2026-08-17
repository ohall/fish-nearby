set search_path = public, extensions;

create type public.water_body_type as enum
  ('lake', 'pond', 'reservoir', 'river', 'stream', 'unknown');

create type public.evidence_type as enum
  ('agency_recommended_presence', 'agency_listed_presence', 'stocking', 'survey', 'report');

create type public.extraction_method as enum
  ('structured_source', 'deterministic_document', 'llm_document');

create type public.review_state as enum ('accepted', 'review', 'rejected');
create type public.confidence_tier as enum ('high', 'medium', 'low');
create type public.ingestion_run_status as enum
  ('fetching', 'staged', 'validated', 'published', 'failed');
create type public.snapshot_kind as enum ('full', 'incremental');
create type public.inference_validation_status as enum ('pending', 'valid', 'invalid');
create type public.review_actor_type as enum ('rule', 'correction', 'reviewer');

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'fish_nearby_read') then
    create role fish_nearby_read nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'fish_nearby_job') then
    create role fish_nearby_job nologin;
  end if;
end
$$;

create table public.source (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  agency text not null check (btrim(agency) <> ''),
  upstream_url text not null check (upstream_url ~ '^https://'),
  source_kind text not null check (source_kind in ('arcgis', 'socrata', 'pdf', 'web')),
  jurisdiction char(2) not null check (jurisdiction ~ '^[A-Z]{2}$'),
  refresh_cadence text,
  attribution text,
  license_notes text,
  enabled boolean not null default true,
  current_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency, name)
);

create table public.ingestion_run (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source(id) on delete restrict,
  code_version text not null check (btrim(code_version) <> ''),
  snapshot_kind public.snapshot_kind not null,
  status public.ingestion_run_status not null default 'fetching',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  last_successful_watermark text,
  fetched_count integer not null default 0 check (fetched_count >= 0),
  new_count integer not null default 0 check (new_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  failure_code text,
  failure_detail text,
  created_at timestamptz not null default now(),
  unique (id, source_id),
  check ((status in ('published', 'failed')) = (finished_at is not null)),
  check (status = 'failed' or failure_code is null)
);

alter table public.source
  add constraint source_current_run_fk
  foreign key (current_run_id) references public.ingestion_run(id) on delete set null;

create table public.raw_import (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source(id) on delete restrict,
  ingestion_run_id uuid not null,
  artifact_key text not null check (btrim(artifact_key) <> ''),
  content_hash char(64) not null check (content_hash ~ '^[0-9a-f]{64}$'),
  fetched_at timestamptz not null default now(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (source_id, artifact_key, content_hash),
  unique (id, source_id),
  foreign key (ingestion_run_id, source_id)
    references public.ingestion_run(id, source_id) on delete restrict
);

create index raw_import_run_idx on public.raw_import (ingestion_run_id);

create table public.inference (
  id uuid primary key default gen_random_uuid(),
  raw_import_id uuid references public.raw_import(id) on delete restrict,
  task text not null check (btrim(task) <> ''),
  provider text not null check (btrim(provider) <> ''),
  model text not null check (btrim(model) <> ''),
  prompt_version text not null check (btrim(prompt_version) <> ''),
  input_hash char(64) not null check (input_hash ~ '^[0-9a-f]{64}$'),
  output jsonb,
  validation_status public.inference_validation_status not null default 'pending',
  validation_errors jsonb,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  cost_usd numeric(12, 8) check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  unique (task, provider, model, prompt_version, input_hash),
  check (validation_status <> 'valid' or output is not null)
);

create table public.water_body (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null check (btrim(normalized_name) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  type public.water_body_type not null default 'unknown',
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  county text,
  geom geometry(Point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state, normalized_name),
  check (st_isvalid(geom)),
  check (st_x(geom) between -180 and 180),
  check (st_y(geom) between -90 and 90)
);

create function public.fish_nearby_geography(value geometry)
returns geography
language sql
immutable
strict
parallel safe
return value::geography;

create function public.fish_nearby_geography_point(
  longitude double precision,
  latitude double precision
)
returns geography
language sql
immutable
strict
parallel safe
return st_setsrid(st_makepoint(longitude, latitude), 4326)::geography;

create function public.fish_nearby_geometry_point(
  longitude double precision,
  latitude double precision
)
returns geometry
language sql
immutable
strict
parallel safe
return st_setsrid(st_makepoint(longitude, latitude), 4326);

create function public.fish_nearby_longitude(value geometry)
returns double precision
language sql
immutable
strict
parallel safe
return st_x(value);

create function public.fish_nearby_latitude(value geometry)
returns double precision
language sql
immutable
strict
parallel safe
return st_y(value);

create function public.fish_nearby_distance(value geometry, origin geography)
returns double precision
language sql
immutable
strict
parallel safe
return st_distance(value::geography, origin);

create function public.fish_nearby_dwithin(
  value geometry,
  origin geography,
  radius_meters double precision
)
returns boolean
language sql
immutable
strict
parallel safe
return st_dwithin(value::geography, origin, radius_meters);

create index water_body_geography_gist
  on public.water_body using gist ((geom::geography));
create index water_body_state_normalized_name_idx
  on public.water_body (state, normalized_name);

create table public.water_body_source (
  id uuid primary key default gen_random_uuid(),
  water_body_id uuid not null references public.water_body(id) on delete restrict,
  source_id uuid not null references public.source(id) on delete restrict,
  external_id text not null check (btrim(external_id) <> ''),
  observed_name text not null check (btrim(observed_name) <> ''),
  raw_import_id uuid not null,
  match_confidence public.confidence_tier not null,
  review_state public.review_state not null default 'review',
  first_seen_run_id uuid not null,
  last_seen_run_id uuid not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id),
  foreign key (raw_import_id, source_id)
    references public.raw_import(id, source_id) on delete restrict,
  foreign key (first_seen_run_id, source_id)
    references public.ingestion_run(id, source_id) on delete restrict,
  foreign key (last_seen_run_id, source_id)
    references public.ingestion_run(id, source_id) on delete restrict
);

create index water_body_source_water_idx on public.water_body_source (water_body_id)
  where retired_at is null;

create table public.species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null check (btrim(common_name) <> ''),
  normalized_common_name text not null check (btrim(normalized_common_name) <> ''),
  scientific_name text,
  taxonomy_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_common_name),
  unique (scientific_name),
  unique (taxonomy_key)
);

create table public.species_alias (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete cascade,
  source_id uuid references public.source(id) on delete cascade,
  alias text not null check (btrim(alias) <> ''),
  normalized_alias text not null check (btrim(normalized_alias) <> ''),
  created_at timestamptz not null default now(),
  unique nulls not distinct (source_id, normalized_alias)
);

create table public.water_body_species (
  id uuid primary key default gen_random_uuid(),
  water_body_id uuid not null references public.water_body(id) on delete restrict,
  species_id uuid not null references public.species(id) on delete restrict,
  source_id uuid not null references public.source(id) on delete restrict,
  raw_import_id uuid not null,
  inference_id uuid references public.inference(id) on delete restrict,
  source_evidence_key text not null check (btrim(source_evidence_key) <> ''),
  evidence_type public.evidence_type not null,
  extraction_method public.extraction_method not null,
  observed_on date,
  published_on date,
  confidence_tier public.confidence_tier not null,
  review_state public.review_state not null default 'review',
  first_seen_run_id uuid not null,
  last_seen_run_id uuid not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_evidence_key),
  foreign key (raw_import_id, source_id)
    references public.raw_import(id, source_id) on delete restrict,
  foreign key (first_seen_run_id, source_id)
    references public.ingestion_run(id, source_id) on delete restrict,
  foreign key (last_seen_run_id, source_id)
    references public.ingestion_run(id, source_id) on delete restrict
);

create index water_body_species_public_water_idx
  on public.water_body_species (water_body_id, species_id)
  where review_state = 'accepted' and retired_at is null;

create table public.review_decision (
  id uuid primary key default gen_random_uuid(),
  water_body_species_id uuid not null references public.water_body_species(id) on delete restrict,
  previous_state public.review_state,
  decided_state public.review_state not null,
  reason text not null check (btrim(reason) <> ''),
  actor_type public.review_actor_type not null,
  actor_reference text not null check (btrim(actor_reference) <> ''),
  rule_version text,
  created_at timestamptz not null default now(),
  check (previous_state is null or previous_state <> decided_state),
  check ((actor_type = 'rule') = (rule_version is not null))
);

create function public.reject_immutable_row_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end
$$;

create trigger raw_import_immutable
before update or delete on public.raw_import
for each row execute function public.reject_immutable_row_change();

create trigger inference_immutable
before update or delete on public.inference
for each row execute function public.reject_immutable_row_change();

create trigger review_decision_immutable
before update or delete on public.review_decision
for each row execute function public.reject_immutable_row_change();

create view public.public_water_body as
select distinct
  water.id,
  water.display_name,
  water.type,
  water.state,
  water.county,
  water.geom
from public.water_body as water
join public.water_body_source as mapping on mapping.water_body_id = water.id
where mapping.retired_at is null
  and mapping.review_state = 'accepted';

create view public.public_water_body_evidence as
select
  evidence.id,
  evidence.water_body_id,
  evidence.species_id,
  fish.common_name as species_common_name,
  fish.scientific_name as species_scientific_name,
  evidence.evidence_type,
  evidence.observed_on,
  evidence.published_on,
  evidence.confidence_tier,
  registry.name as source_label,
  registry.upstream_url as source_url
from public.water_body_species as evidence
join public.species as fish on fish.id = evidence.species_id
join public.source as registry on registry.id = evidence.source_id
where evidence.review_state = 'accepted'
  and evidence.retired_at is null;

revoke all on all tables in schema public from public;
revoke all on all functions in schema public from public;

grant usage on schema public, extensions to fish_nearby_read, fish_nearby_job;
grant execute on function
  public.fish_nearby_geography(geometry),
  public.fish_nearby_geography_point(double precision, double precision),
  public.fish_nearby_geometry_point(double precision, double precision),
  public.fish_nearby_longitude(geometry),
  public.fish_nearby_latitude(geometry),
  public.fish_nearby_distance(geometry, geography),
  public.fish_nearby_dwithin(geometry, geography, double precision)
to fish_nearby_read, fish_nearby_job;
grant select on public.public_water_body, public.public_water_body_evidence to fish_nearby_read;

grant select, insert, update on
  public.source,
  public.ingestion_run,
  public.water_body,
  public.water_body_source,
  public.species,
  public.species_alias,
  public.water_body_species
to fish_nearby_job;
grant select, insert on
  public.raw_import,
  public.inference,
  public.review_decision
to fish_nearby_job;

alter table public.source enable row level security;
alter table public.ingestion_run enable row level security;
alter table public.raw_import enable row level security;
alter table public.inference enable row level security;
alter table public.water_body enable row level security;
alter table public.water_body_source enable row level security;
alter table public.species enable row level security;
alter table public.species_alias enable row level security;
alter table public.water_body_species enable row level security;
alter table public.review_decision enable row level security;

create policy job_access on public.source for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.ingestion_run for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.raw_import for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.inference for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.water_body for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.water_body_source for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.species for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.species_alias for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.water_body_species for all to fish_nearby_job using (true) with check (true);
create policy job_access on public.review_decision for all to fish_nearby_job using (true) with check (true);

comment on view public.public_water_body is
  'Public projection of accepted, active water bodies. Precise user coordinates are never stored here.';
comment on view public.public_water_body_evidence is
  'Public projection of accepted, active evidence; excludes lineage, inference, and review internals.';
