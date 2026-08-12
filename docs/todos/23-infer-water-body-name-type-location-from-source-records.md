# Infer water-body name/type/location from source records

## Technology

**LLM semantic extraction**

## How it works

The model converts abbreviations and narrative source context into a candidate water-body description.

## MVP implementation

- Preserve observed text.
- Return normalized fields separately.
- Do not invent unsupported coordinates.
- Carry uncertainty.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
