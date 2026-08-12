# Fix entity-resolution edge cases

## Technology

**Human review + targeted rules**

## How it works

Real data will reveal aliases, duplicate names, river segments, and cross-state waters.

## MVP implementation

- Use geography before fuzzy names.
- Add aliases only from real cases.
- Keep merge/split corrections auditable.
- Avoid premature generalization.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
