# Query nearby water bodies

## Technology

**Location/viewport-driven API**

## How it works

The map center triggers the nearby-water endpoint; results refresh when the user searches or moves meaningfully.

## MVP implementation

- Debounce.
- Abort stale requests.
- Use fixed or viewport radius.
- Cache recent results.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
