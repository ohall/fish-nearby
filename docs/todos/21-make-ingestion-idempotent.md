# Make ingestion idempotent

## Technology

**Unique constraints + upserts**

## How it works

Repeated imports should produce the same logical database state.

## MVP implementation

- Use stable source IDs.
- Enforce DB uniqueness.
- Upsert transactionally.
- Handle deletions separately from failed fetches.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
