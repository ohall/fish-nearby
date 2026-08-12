# Hash artifacts to avoid duplicate processing

## Technology

**SHA-256 content hashing**

## How it works

A content hash makes unchanged upstream records cheap to recognize and skip.

## MVP implementation

- Hash canonical bytes/text.
- Store source + external ID + hash.
- Reuse hash in inference-cache keys.
- Do not trust timestamps alone.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
