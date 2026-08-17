\set ON_ERROR_STOP on

begin;

do $$
begin
  if not has_schema_privilege('fish_nearby_read', 'public', 'usage') then
    raise exception 'read role lacks public schema usage';
  end if;
  if not has_table_privilege('fish_nearby_read', 'public.public_water_body', 'select') then
    raise exception 'read role cannot select public water view';
  end if;
  if has_table_privilege('fish_nearby_read', 'public.raw_import', 'select') then
    raise exception 'read role can access raw imports';
  end if;
  if has_table_privilege('fish_nearby_read', 'public.water_body', 'insert') then
    raise exception 'read role can write water bodies';
  end if;
  if has_table_privilege('fish_nearby_job', 'public.raw_import', 'update') then
    raise exception 'job role can mutate raw imports';
  end if;
end
$$;

insert into public.ingestion_run (
  id, source_id, code_version, snapshot_kind, status, finished_at,
  fetched_count, new_count, accepted_count
)
values (
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'integration-fixture',
  'full',
  'published',
  now(),
  2,
  2,
  1
);

update public.source
set current_run_id = '40000000-0000-4000-8000-000000000001'
where id = '00000000-0000-4000-8000-000000000001';

insert into public.raw_import (
  id, source_id, ingestion_run_id, artifact_key, content_hash, payload
)
values (
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'layer-121:42',
  repeat('a', 64),
  '{"attributes":{"OBJECTID":42}}'::jsonb
);

insert into public.water_body (
  id, normalized_name, display_name, type, state, county, geom
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'ramapo lake',
    'Ramapo Lake',
    'lake',
    'NJ',
    'Passaic',
    public.fish_nearby_geometry_point(-74.251, 41.032)
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'review lake',
    'Review Lake',
    'lake',
    'NJ',
    'Passaic',
    public.fish_nearby_geometry_point(-74.270, 41.040)
  );

insert into public.water_body_source (
  water_body_id, source_id, external_id, observed_name, raw_import_id,
  match_confidence, review_state, first_seen_run_id, last_seen_run_id
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '42',
    'Ramapo Lake',
    '50000000-0000-4000-8000-000000000001',
    'high',
    'accepted',
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '43',
    'Review Lake',
    '50000000-0000-4000-8000-000000000001',
    'medium',
    'review',
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001'
  );

insert into public.water_body_species (
  id, water_body_id, species_id, source_id, raw_import_id,
  source_evidence_key, evidence_type, extraction_method, published_on,
  confidence_tier, review_state, first_seen_run_id, last_seen_run_id
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'layer-122:42:largemouth-bass',
    'agency_listed_presence',
    'structured_source',
    date '2026-08-12',
    'high',
    'accepted',
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'layer-122:42:smallmouth-bass',
    'agency_listed_presence',
    'structured_source',
    date '2026-08-12',
    'medium',
    'review',
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001'
  );

do $$
declare
  public_water_count integer;
  public_evidence_count integer;
  measured_distance double precision;
begin
  select count(*) into public_water_count from public.public_water_body;
  if public_water_count <> 1 then
    raise exception 'expected 1 accepted water, got %', public_water_count;
  end if;

  select count(*) into public_evidence_count from public.public_water_body_evidence;
  if public_evidence_count <> 1 then
    raise exception 'expected 1 accepted evidence row, got %', public_evidence_count;
  end if;

  select public.fish_nearby_distance(
    geom,
    public.fish_nearby_geography_point(-74.251, 41.032)
  )
  into measured_distance
  from public.public_water_body
  where id = '20000000-0000-4000-8000-000000000001';

  if measured_distance > 0.01 then
    raise exception 'unexpected spatial distance: %', measured_distance;
  end if;
end
$$;

do $$
begin
  begin
    insert into public.raw_import (
      source_id, ingestion_run_id, artifact_key, content_hash, payload
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'layer-121:42',
      repeat('a', 64),
      '{}'::jsonb
    );
    raise exception 'duplicate raw artifact was accepted';
  exception when unique_violation then
    null;
  end;

  begin
    update public.raw_import
    set payload = '{}'::jsonb
    where id = '50000000-0000-4000-8000-000000000001';
    raise exception 'raw artifact mutation was accepted';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  begin
    insert into public.water_body (
      normalized_name, display_name, type, state, geom
    ) values (
      'invalid point',
      'Invalid Point',
      'unknown',
      'NJ',
      public.fish_nearby_geometry_point(181, 41)
    );
    raise exception 'out-of-range geometry was accepted';
  exception when check_violation then
    null;
  end;
end
$$;

set local enable_seqscan = off;

do $$
declare
  query_plan json;
begin
  execute $query$
    explain (format json)
    select water.id
    from public.public_water_body as water
    where public.fish_nearby_dwithin(
      water.geom,
      public.fish_nearby_geography_point(-74.294, 41.031),
      25000
    )
  $query$
  into query_plan;

  if query_plan::text not like '%water_body_geography_gist%' then
    raise exception 'nearby query did not use geography index: %', query_plan;
  end if;
end
$$;

rollback;
