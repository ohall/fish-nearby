# `GET /api/waters/:id`

## Technology

**REST detail endpoint**

## How it works

A marker tap loads full species/evidence details without bloating the initial map request.

## MVP implementation

- 404 unknown IDs.
- Join species/evidence/source.
- Sort useful evidence first.
- Never expose raw imports.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
