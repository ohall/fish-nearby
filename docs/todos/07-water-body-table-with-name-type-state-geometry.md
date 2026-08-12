# `water_body` table with name, type, state, geometry

## Technology

**PostgreSQL + PostGIS geometry**

## How it works

This is the canonical identity for each lake, pond, reservoir, river, or stream; all source records resolve here.

## MVP implementation

- UUID primary key.
- Store normalized name/type/state.
- Start with point geometry if necessary.
- Preserve external IDs.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
