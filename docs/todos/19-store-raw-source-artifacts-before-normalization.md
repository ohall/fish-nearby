# Store raw source artifacts before normalization

## Technology

**Raw-first ETL**

## How it works

Normalization always runs from a persisted raw record, making retries and prompt changes safe.

## MVP implementation

- Write raw row first.
- Track processing state separately.
- Normalize by raw-import ID.
- Keep original source text/JSON.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
