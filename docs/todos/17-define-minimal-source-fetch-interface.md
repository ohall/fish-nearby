# Define minimal `Source.fetch()` interface

## Technology

**TypeScript adapter interface**

## How it works

Source adapters fetch raw artifacts; generic code performs normalization, matching, validation, and persistence.

## MVP implementation

- Return `RawArtifact[]`.
- Handle pagination inside the adapter.
- Keep species normalization out of adapters.
- Record counts/timestamps.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
