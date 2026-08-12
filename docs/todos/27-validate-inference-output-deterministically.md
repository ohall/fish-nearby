# Validate inference output deterministically

## Technology

**Zod/JSON Schema + DB checks**

## How it works

The LLM proposes facts; code decides whether those facts are valid enough to persist.

## MVP implementation

- Schema-validate.
- Check IDs exist.
- Check coordinates/state bounds.
- Reject unsupported matches.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
