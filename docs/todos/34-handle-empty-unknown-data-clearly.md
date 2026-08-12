# Handle empty / unknown data clearly

## Technology

**Explicit unknown-data state**

## How it works

Missing records must never be interpreted as proof that a water contains no fish.

## MVP implementation

- Say `No species data found yet`.
- Show nearby known waters.
- Keep ingestion gaps visible.
- Never infer absence from missing evidence.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
