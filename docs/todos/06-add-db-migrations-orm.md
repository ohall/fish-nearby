# Add DB migrations / ORM

## Technology

**Drizzle ORM + SQL migrations**

## How it works

Drizzle gives typed schemas/migrations without hiding SQL, which is useful for PostGIS functions and indexes.

## MVP implementation

- Check migrations into Git.
- Use raw SQL for spatial functions when clearer.
- Share schema/types.
- Never auto-mutate production schema on startup.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
