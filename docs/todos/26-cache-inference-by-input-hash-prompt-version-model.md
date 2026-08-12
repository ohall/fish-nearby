# Cache inference by input hash + prompt version + model

## Technology

**Content-addressed inference cache**

## How it works

The same semantic work is never paid for twice unless the input, prompt, or model changes.

## MVP implementation

- Lookup before calling OpenRouter.
- Cache structured success.
- Version prompts.
- Provide reprocess tooling.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
