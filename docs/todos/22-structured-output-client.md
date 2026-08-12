# Structured-output client

## Technology

**OpenRouter structured outputs + JSON Schema**

## How it works

Compatible models can be required to return JSON matching a schema, eliminating free-form parsing for core ETL.

## MVP implementation

- Use `response_format: json_schema`.
- Use strict schemas.
- Validate locally too.
- Require compatible model/provider parameters.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
