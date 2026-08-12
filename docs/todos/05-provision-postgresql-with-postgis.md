# Provision PostgreSQL with PostGIS

## Technology

**Supabase PostgreSQL + PostGIS**

## How it works

PostGIS adds spatial types, functions, and indexes so nearby-water searches stay inside PostgreSQL.

## MVP implementation

- Enable PostGIS.
- Use SRID 4326.
- Use geography distance queries in meters.
- Keep spatial logic in SQL, not the browser.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
