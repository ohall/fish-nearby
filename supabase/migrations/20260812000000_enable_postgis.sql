create schema if not exists extensions;

create extension if not exists postgis with schema extensions;

create or replace function public.fish_nearby_postgis_smoke_test()
returns boolean
language sql
immutable
return st_dwithin(
    st_setsrid(st_makepoint(-74.294, 41.031), 4326)::geography,
    st_setsrid(st_makepoint(-74.294, 41.031), 4326)::geography,
    1
  );

revoke all on function public.fish_nearby_postgis_smoke_test() from public;
