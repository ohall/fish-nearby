# `POST /api/waters/search`

## Technology

**Next.js Route Handler + PostGIS**

## How it works

This endpoint accepts latitude, longitude, and radius in a JSON body, finds water
bodies near the point with `ST_DWithin`, and returns lightweight map summaries.
Using a request body keeps precise coordinates out of URLs and ordinary access
logs.

## MVP implementation

- Validate coordinates/radius.
- Redact coordinates from logs, traces, analytics, and errors.
- Cap result count.
- Return only map-needed fields.
- Use indexed spatial filtering.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
