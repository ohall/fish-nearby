# Normalize fish names to canonical species

## Technology

**LLM-assisted taxonomy mapping**

## How it works

Abbreviations and variants are mapped to canonical species IDs.

## MVP implementation

- Give candidate species IDs/names.
- Require known ID or null.
- Preserve source text.
- Unknowns go to review.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
