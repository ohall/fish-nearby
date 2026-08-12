\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1
    from pg_extension
    where extname = 'postgis'
  ) then
    raise exception 'PostGIS extension is not installed';
  end if;
end
$$;

select public.fish_nearby_postgis_smoke_test();

rollback;
