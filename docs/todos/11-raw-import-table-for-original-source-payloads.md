# `raw_import` table for original source payloads

## Technology

**Immutable raw artifact store**

## How it works

Persist what was fetched before normalizing it so failed or improved normalization can be replayed.

## MVP implementation

- Store source/external ID/timestamp/hash/payload.
- Link normalized rows back to raw input.
- Treat as append-only/content-addressed.
- Move large binaries to object storage later if needed.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
