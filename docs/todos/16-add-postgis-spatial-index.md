# Add PostGIS spatial index

## Technology

**GiST index**

## How it works

GiST lets PostgreSQL avoid scanning every geometry for nearby searches.

## MVP implementation

- Index the geometry/geography expression actually queried.
- Verify with `EXPLAIN ANALYZE`.
- Use consistent SRIDs/transforms.
- Add this before statewide data.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
