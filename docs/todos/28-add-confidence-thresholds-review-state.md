# Add confidence thresholds / review state

## Technology

**Rule-based review workflow**

## How it works

Confidence combines source quality and matching evidence rather than blindly trusting an LLM self-score.

## MVP implementation

- States: accepted/review/rejected.
- Auto-accept deterministic exact matches.
- Review fuzzy/contradictory matches.
- Tune after the first verified dataset.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
