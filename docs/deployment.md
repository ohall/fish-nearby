# Deployment Recommendation

Pricing verified 2026-08-12.

## Recommendation

Use:
- **Vercel** — Next.js web app + thin HTTP API
- **Supabase** — PostgreSQL/PostGIS + optional Auth
- **GitHub Actions** — ingestion/OpenRouter normalization jobs
- **OpenRouter** — LLM inference
- **MapLibre GL JS** — map renderer with a separate tile/style provider

This stack is a strong MVP fit.

## Cost

### Prototype / private development

Potentially **$0/month** for web/database hosting:
- Vercel Hobby: $0
- Supabase Free: $0

Supabase Free currently includes a 500 MB database and two active projects; inactive free projects may pause.

**Vercel Hobby is personal/non-commercial only.**

### Small production product

Baseline:
- Vercel Pro: **$20/month**
- Supabase Pro: **$25/month**
- baseline hosting/database: **about $45/month**

Supabase Pro currently includes $10/month of compute credits, enough for one Micro instance.

Early variable-cost risks are more likely:
1. OpenRouter inference
2. map tiles/geocoding
3. accidental repeat normalization

The raw-artifact hash + inference cache controls #3.

## Why ingestion should not run as a Vercel request

ETL may page APIs, parse documents, call OpenRouter repeatedly, and retry rate limits. That is long-running batch work.

Use GitHub Actions initially:

```text
schedule/manual dispatch
        |
        v
fetch public sources
        |
        v
store raw_import
        |
        v
normalize + OpenRouter
        |
        v
Supabase Postgres
```

Keep Vercel functions focused on short user-facing requests.

## Runtime architecture

```text
Mobile browser
      |
      v
Vercel / Next.js
  |            |
  |            +--> tile/geocoding provider
  |
  +--> Supabase Postgres/PostGIS
           ^
           |
     GitHub Actions
           |
     OpenRouter + public
      fisheries APIs
```

## Upgrade triggers

Stay free while prototyping. Move to paid tiers when:
- use becomes commercial
- you need a DB that never pauses
- you need production backups/support
- real users depend on uptime
- free caps become constraining

Do not pre-scale Postgres. Spatially indexed nearby lookups over thousands of water bodies are small workloads.

Official pricing:
`https://vercel.com/pricing`
`https://vercel.com/docs/plans/hobby`
`https://supabase.com/pricing`
`https://supabase.com/docs/guides/platform/manage-your-usage/compute`
