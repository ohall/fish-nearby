# `inference` table with model, prompt version, input hash, and output

## Technology

**LLM cache/audit table**

## How it works

Inference becomes reproducible, debuggable, and cacheable instead of an opaque side effect.

## MVP implementation

- Cache by input hash + prompt version + model.
- Store structured output.
- Store validation status.
- Never overwrite old prompt-version results.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
