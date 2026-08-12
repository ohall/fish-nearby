# `water_body_species` relationship with provenance and confidence

## Technology

**Many-to-many relationship**

## How it works

This joins waters to species while preserving why the association exists and how trustworthy it is.

## MVP implementation

- Store evidence type/source/date/confidence.
- Keep stocking separate from surveys/presence lists.
- Allow multiple evidence rows.
- Use uniqueness constraints.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
