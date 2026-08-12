# Resolve ambiguous water bodies against nearby DB candidates

## Technology

**Candidate generation + LLM reranking**

## How it works

Deterministic geography/name logic produces plausible candidates; the model chooses only among them or returns no match.

## MVP implementation

- Generate candidates first.
- Pass candidate IDs.
- Require candidate ID or null.
- Review ambiguous matches.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
