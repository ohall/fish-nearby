# `GET /waters?lat=&lng=&radius=`

## Technology

**Next.js Route Handler + PostGIS**

## How it works

This endpoint finds water bodies near a point with `ST_DWithin` and returns lightweight map summaries.

## MVP implementation

- Validate coordinates/radius.
- Cap result count.
- Return only map-needed fields.
- Use indexed spatial filtering.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
