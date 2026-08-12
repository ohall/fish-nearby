# Fish Nearby implementation plan

## Purpose

Build a public, mobile-first web app that answers a narrow question well:

> Which fish species have credible public evidence for water bodies near this location?

The first release is a North Jersey pilot with 20–50 manually verified water
bodies. Statewide New Jersey is the next rollout. New York and additional data
sources follow only after the New Jersey pipeline is repeatable and the public
experience is useful.

This document defines delivery order, boundaries, and measurable completion
gates. The pages in [`docs/todos`](todos/) remain the detailed design notes for
individual work items, and [`data-model.md`](data-model.md) is the current schema
proposal to finalize during Phase 1.

## Current state

The repository currently contains product and technical documentation only.
There is no application scaffold, package manifest, database migration, test
suite, workflow, or deployment configuration. All implementation should
therefore be treated as greenfield work.

## MVP boundary

### In scope

- Anonymous, mobile-friendly map experience.
- Current-location and searched-location discovery.
- Nearby water-body point markers.
- Per-water species evidence, source, and evidence date.
- A deterministic import of the NJDEP Great Fishing Close to Home point layer
  and related Game Fish table.
- Raw-source retention, reproducible normalization, and idempotent reruns.
- A manually reviewed North Jersey quality set.
- OpenRouter only as a bounded fallback for ambiguous records.
- A production deployment with privacy-safe monitoring and a repeatable
  ingestion job.

### Explicitly out of scope

- Consumer accounts, saved places, catch logging, and social features.
- Forecasts, weather, tackle recommendations, and notifications.
- Native mobile apps and offline maps.
- Water polygons and stream lines unless point markers prove inadequate.
- A general-purpose data-review UI. Start with reports and checked-in
  corrections; add reviewer authentication and UI only when the exception
  volume justifies it.
- New York ingestion before the New Jersey release gates pass.

## Product and data principles

1. **Evidence is not certainty.** A source may list, recommend, stock, survey,
   or merely regulate a species. Preserve that distinction in storage, APIs,
   and user-facing language.
2. **Confidence describes the mapping.** It measures confidence that a source
   record was mapped to the correct water body and species; it must not imply a
   probability that an angler will find or catch that species.
3. **Unknown is not absent.** Missing evidence is shown as "No species data
   found yet," never as proof that a species is not present.
4. **Raw data comes first.** Persist a fetched source record before deriving
   canonical facts from it, so fixes can be replayed without refetching.
5. **Use deterministic data directly.** Stable NJDEP identifiers, coordinates,
   names, and related species rows do not need an LLM. Use OpenRouter only when
   ordinary rules and candidate matching cannot produce a safe result.
6. **Precise user location is ephemeral.** Do not store it or include it in
   application logs, analytics, traces, error reports, cache keys, raw imports,
   or OpenRouter inputs.
7. **Claim and extraction method are separate.** A document can report a survey
   or stocking event whether code or an LLM extracted it. Preserve the source's
   claim as the evidence type and record the extraction method independently.

## Target architecture

```text
Mobile browser
  -> Next.js on Vercel
     -> public read service -> pooled PostgreSQL/PostGIS connection
     -> map tile/style provider
     -> geocoder adapter

GitHub Actions (scheduled or manual)
  -> NJDEP ArcGIS adapter
  -> immutable raw imports
  -> deterministic normalization
  -> optional OpenRouter fallback
  -> validation and atomic publication
  -> PostgreSQL/PostGIS
```

Keep this as one deployable Next.js application plus a separately invoked
TypeScript ingestion entry point. Separate modules by responsibility rather than
creating services prematurely:

```text
src/app/                         Next.js pages and route handlers
src/features/map/                map, search, and detail UI
src/contracts/                   API and ingestion schemas/DTOs
src/server/db/                   Drizzle schema, connection, repositories
src/server/services/             application rules and orchestration
src/server/integrations/         ArcGIS, geocoder, tiles, OpenRouter
src/server/ingestion/            fetch, hash, normalize, validate, publish
drizzle/                         checked-in SQL migrations
tests/{unit,integration,e2e}/    automated tests
tests/fixtures/                  frozen upstream and golden-data fixtures
```

Framework objects should stop at route and job boundaries. Services accept and
return plain typed values, and integrations sit behind small interfaces so tests
never need live providers.

## Contracts to settle first

These decisions unblock both the UI and ingestion tracks and should be recorded
as types, migrations, and short architecture decision records where appropriate.

### Public API

Use a body-based nearby search so precise coordinates do not appear in URLs or
default access logs:

```http
POST /api/waters/search
Content-Type: application/json

{
  "latitude": 41.031,
  "longitude": -74.294,
  "radiusMeters": 25000
}
```

Initial limits:

- `latitude`: -90 through 90.
- `longitude`: -180 through 180.
- `radiusMeters`: 1,000 through 100,000; default 25,000.
- At most 200 results, ordered by distance then normalized name.
- Return water ID, display name, type, representative point, distance, and an
  accepted distinct-species count; do not return evidence detail in this
  response.

Use `GET /api/waters/:id` for a selected water body. It returns canonical water
metadata and accepted species evidence grouped by species. Each evidence item
contains evidence type, source label, source URL when safe, observed/published
date when known, and a mapping-confidence tier. It never returns raw imports,
prompts, inference records, internal review notes, or provider payloads.

Both routes use shared Zod schemas, a stable JSON error envelope, bounded query
cost, same-origin CORS, and a least-privileged read-only database role. UUIDs and
all external input are validated at the route boundary. The error envelope is
`{"error":{"code":"...","message":"...","requestId":"..."}}`; messages are
safe for users and never expose stack traces or provider/database details.

This intentionally replaces the query-string shape proposed in todo 13 and the
current data-model API note. If hosting-layer request-body logging is ever
enabled, it must redact coordinates.

The browser accesses application data only through these Next.js routes; it does
not query Supabase tables directly. The server uses a role limited to accepted
public views/functions. A separate job role writes ingestion data, and a later
reviewer role may write review decisions after server-side session verification.
RLS and grants protect every base table as defense in depth even when reviewer
authentication and its UI are deferred.

### Core data model

Use the existing [data-model proposal](data-model.md) as the starting point, but
resolve these gaps before creating the first migration:

- Add `ingestion_run` so complete, partial, and failed source snapshots are
  distinguishable and deletion handling is safe.
- Add an explicit `water_body_source` mapping instead of relying only on an
  `external_ids` JSON object. Preserve source ID, observed name, raw-import
  lineage, and match/review state.
- Treat `water_body_species` as an evidence ledger with multiple rows per
  water/species pair, not as a single deduplicated join. Its current name may
  remain, but its API and constraints must reflect evidence-row semantics.
- Require every adapter to supply a stable external record or artifact key. Make
  raw-import uniqueness include source, artifact key, and canonical content hash
  so a changed record remains replayable and identical records with different
  upstream identities are not collapsed.
- Index the exact spatial expression used by the nearby query. A GiST index on
  `geom` does not automatically prove index use for every `geom::geography`
  expression; verify the final migration with `EXPLAIN`.

The resulting tables have these responsibilities:

- `source`: agency, upstream URL, source kind, jurisdiction, refresh cadence,
  attribution/licensing notes, enabled state, and current published run.
- `ingestion_run`: source, code version, start/end time, status, last successful
  watermark, and fetched/new/changed/unchanged/accepted/review/rejected/error
  counts. Status progresses through `fetching`, `staged`, `validated`, and
  `published`, or ends at `failed`; only a complete run can become published.
- `raw_import`: append-only source record keyed by source, stable artifact key,
  and canonical SHA-256 content hash; includes fetch time, run ID, and original
  JSON.
- `water_body`: UUID, normalized/display names, type, state, and an SRID 4326
  representative point for the MVP.
- `water_body_source`: stable source/external-ID mapping back to a canonical
  water body, with observed source name, raw-import lineage, first/last-seen run,
  and retirement state.
- `species`: canonical common name, scientific name, and optional taxonomy key.
- `species_alias`: normalized source text mapped to a canonical species with
  source scope where necessary.
- `water_body_species`: water body, species, source, raw import, evidence type,
  stable source-evidence key, observed/event and publication dates, mapping
  confidence, review state, extraction method, first/last-seen run, retirement
  state, and lineage. Its logical uniqueness includes the source-evidence key so
  independent source records with the same species/date are not collapsed.
- `inference`: immutable input hash, task, prompt version, model/provider
  identity, structured output, validation result, usage, and timestamps.
- `review_decision`: append-only accepted/review/rejected transition with reason,
  timestamp, and actor type/reference. Automated decisions cite a rule/version;
  file-based manual corrections cite the correction ID and Git commit; a future
  reviewer UI cites its authenticated user.

Only active, `accepted` evidence is visible through anonymous APIs. Enforce
foreign keys, uniqueness, enum/check constraints, and timestamps in the database
as well as application schemas.

Normalization writes into run-scoped staging tables or rows that public views
cannot see. After a full-snapshot adapter finishes and all gates pass, one
database transaction:

1. upserts the source mappings and evidence seen in that run;
2. retires previously active rows for that source that the complete snapshot no
   longer contains;
3. marks the run published and advances `source.current_run_id`.

Readers retain the prior committed projection until that transaction commits.
A failed, partial, or anomalous run never advances the source pointer or retires
data. Incremental adapters never infer deletions; they need an explicit tombstone
or a later complete reconciliation run.

For nearby queries, use one documented PostGIS representation consistently:
store a `geometry(Point, 4326)`, query its geography cast in meters, and create a
matching GiST expression index. Verify index use with `EXPLAIN (ANALYZE, BUFFERS)`
against a statewide-sized fixture before launch.

### Evidence and review policy

Start with these evidence types:

- `agency_recommended_presence`
- `agency_listed_presence`
- `stocking`
- `survey`
- `report`

Record extraction separately as `structured_source`, `deterministic_document`,
or `llm_document`. A model must not change the underlying evidence semantics.

Review states are `accepted`, `review`, and `rejected`. Exact stable-ID matches
and known species aliases from an authoritative structured source can be
accepted deterministically. Fuzzy, contradictory, unknown, or LLM-assisted
matches enter review unless a later, fixture-backed rule explicitly permits
automatic acceptance. Checked-in correction data must retain its reason and
source record so reruns stay auditable.

## Delivery sequence

The critical path is foundation -> contracts/schema -> pilot ingestion -> public
API -> integrated map -> verified pilot -> production launch. Once contracts are
frozen, the fixture-backed map UI and NJ ingestion adapter can proceed in
parallel.

| Phase | Outcome | Existing todo coverage | Relative size |
| --- | --- | --- | --- |
| 0. Executable foundation | Reproducible app, local DB, CI, and configuration | 01, 05, 06 | S |
| 1. Storage and contracts | Migrated spatial/provenance model and stable DTOs | 07–12, 15, 16 | M |
| 2. North Jersey ingestion slice | Deterministic, raw-first import for 20–50 waters | 17–21, 35 | M |
| 3. Public read API | Privacy-safe nearby and detail endpoints | 13–16 | S |
| 4. Mobile map | Complete anonymous discovery and evidence flow | 02–04, 29–34 | M |
| 5. Quality and exception handling | Golden set, review states, bounded LLM fallback | 22–28, 36, 37 | M/L |
| 6. Production pilot | Reliable deployment, ingestion, monitoring, and recovery | deployment/auth docs | M |
| 7. Statewide NJ rollout | Same pipeline and product at statewide scale | 38 | M |

Sizes are relative and exclude vendor approval or manual data-review time. Set a
calendar estimate after Phase 0 confirms provider and environment constraints;
estimate statewide review from the measured pilot exception rate rather than
assuming it is purely mechanical.

### Phase 0 — executable foundation

Deliver:

- Scaffold Next.js App Router with strict TypeScript, React, and Node LTS.
- Add the chosen package-manager lockfile and pinned Node/package-manager
  versions.
- Add formatting, linting, typechecking, unit testing, Playwright, and build
  scripts.
- Add `.gitignore`, `.env.example`, typed environment validation, and documented
  local commands.
- Provide local PostgreSQL/PostGIS setup and separate pooled runtime and direct
  migration/job database URLs.
- Create CI for frozen install, format/lint, typecheck, unit tests, PostGIS
  integration tests, production build, and one mobile E2E smoke path.
- Add a short ADR for the tile/style and geocoder provider selection, including
  attribution, quota, key restriction, privacy, CORS, and fallback behavior.

Complete when:

- A clean clone can install, start, test, migrate an empty database, and build
  using README commands.
- Missing or invalid configuration fails fast with a named server-side error.
- OpenRouter, direct database, and service-role credentials cannot enter the
  client bundle, logs, or preview environment.
- PR CI uses an ephemeral PostGIS database and no production credentials.

### Phase 1 — storage and contracts

Deliver:

- Finalize the data-model proposal and add migrations for the core model,
  extensions, constraints, roles/RLS, and spatial index.
- Seed the primary NJ source and the canonical species/alias set needed by the
  pilot fixture.
- Define shared request/response, raw-artifact, normalized-record, and provider
  schemas.
- Implement repositories independently of HTTP and provider payloads.
- Add database integration tests for fresh migration, upgrades, constraints,
  permissions, SRID/distance behavior, and index use.

Complete when:

- Migrations apply from empty and the previous migration state in CI and never
  mutate schema during app startup.
- The anonymous/read role cannot access raw imports, inference, run internals,
  review data, or writes; the job role has only required privileges.
- An `EXPLAIN` fixture demonstrates the matching GiST index for the exact nearby
  query.
- Example DTOs are checked by the same schemas used at runtime.

### Phase 2 — North Jersey ingestion slice

Deliver:

- Implement a small `Source.fetch()` adapter contract with pagination, timeout,
  bounded retry/backoff, and run statistics.
- Build the NJDEP ArcGIS adapter for point layer 121 and related Game Fish table
  122 using checked-in response fixtures.
- Canonicalize JSON, hash with SHA-256, persist raw rows first, and skip unchanged
  work.
- Deterministically map stable source IDs, coordinates, names, and known species
  aliases; quarantine unsupported records.
- Select 20–50 waters biased toward Bergen, Passaic, Morris, and Sussex counties
  and generate an import/report command.
- Stage normalized changes and publish them transactionally only after the fetch
  and validation complete. A partial or empty upstream response cannot imply
  deletion.

Complete when:

- Fixture tests cover pagination, upstream schema errors, retryable failures,
  stable hashing, and invalid coordinates/species.
- Two identical runs produce the same logical rows and no duplicate evidence.
- A failed or partial run leaves the last accepted public dataset intact.
- A complete snapshot retires only source-scoped records absent from that
  snapshot; fixture tests cover deletion, partial-run, and incremental-source
  behavior.
- Every accepted water and evidence row traces to a raw import and source.
- This structured-source path makes zero OpenRouter calls.

### Phase 3 — public read API

Deliver:

- Implement `POST /api/waters/search` and `GET /api/waters/:id` through services
  and repositories.
- Add request validation, stable errors, result limits, distance ordering,
  source-link sanitization, rate limits, and abort/timeout handling.
- Add contract and PostGIS integration tests, including boundary coordinates,
  non-finite values, radius limits, missing IDs, accepted-only filtering, and
  private-field redaction.
- Add a minimally revealing health endpoint for the application and database.

Complete when:

- API fixtures match the shared DTO schemas and expose no raw/inference fields.
- Exact coordinates are absent from logs, traces, analytics, cache keys, and
  errors; automated tests assert redaction.
- The endpoint caps both row count and payload size and uses the spatial index.
- A staging fixture of at least 2,000 waters and 25,000 evidence rows meets a
  warm-database p95 target of 500 ms across 1,000 requests at concurrency 20 and
  the maximum radius, bypassing application/edge caches. Search responses stay
  at or below 250 KiB. Revise either target only with a recorded benchmark and
  rationale.

### Phase 4 — mobile map

Deliver:

- Add MapLibre in a client component with provider configuration and required
  attribution.
- Request browser location once, center at a useful zoom, and never persist the
  coordinates. Treat denial, timeout, and unsupported geolocation as expected
  states.
- Add a provider-neutral location search and a non-location default centered on
  the North Jersey pilot.
- Debounce meaningful moves, abort stale searches, and keep only an in-memory
  recent-result cache keyed by a coarse map cell and radius, never exact user
  coordinates.
- Render one GeoJSON source/layer of point markers. On selection, highlight the
  feature and load a finger-friendly bottom sheet without moving the map.
- Show evidence-specific wording, source/date links, loading/error states, and
  the explicit unknown-data message.
- Label distance as measured to a representative point and disclose that large
  lakes and streams may extend materially closer than their marker.
- Make search and water details keyboard and screen-reader operable, manage
  bottom-sheet focus, and honor reduced-motion settings.

Complete when:

- Playwright covers geolocation granted, denied, timed out/unavailable, and
  searched-location paths on a mobile viewport.
- A user can select a marker, inspect grouped species evidence, follow a safe
  source link, dismiss details, and retain the previous map position.
- Empty data never renders as fish absence, and stocking/listing evidence is not
  described as a survey-confirmed population.
- Core flows meet WCAG 2.2 AA checks and work on the latest two major iOS Safari
  versions and the current Android Chrome stable release; desktop smoke coverage
  includes current Chrome, Firefox, and Safari.

### Phase 5 — quality and exception handling

Deliver:

- Build and manually review a checked-in golden fixture for the pilot waters,
  including expected water mappings, species, evidence type, and provenance.
- Report false positives, false negatives, unknown aliases, and ambiguous water
  matches on every normalization change.
- Add deterministic candidate generation using source IDs, state, geography,
  aliases, and normalized names before considering an LLM.
- Add the OpenRouter fallback behind strict JSON Schema and local Zod/database
  validation. Require a known candidate/species ID or `null`.
- Cache by task + canonical input hash + prompt version + model/provider; retain
  immutable results and usage data.
- Add per-run call, token, and cost ceilings; timeouts and invalid outputs enter
  review without blocking the existing public read path.
- Begin with a report and checked-in correction workflow. Add Supabase magic-link
  reviewer auth, RLS, and an admin UI only if reports are no longer sufficient.

Complete when:

- PR tests mock OpenRouter and cover cache hits, timeouts, invalid schema, unknown
  IDs, rejected matches, and budget exhaustion; CI never calls a live model.
- The golden report has zero known unsupported accepted associations and no
  unexplained regression from the approved baseline.
- Accepted LLM-assisted facts retain input, prompt/model identity, validation,
  source lineage, and reviewer/rule provenance.
- OpenRouter or NJDEP downtime cannot prevent users from reading the last
  successfully published dataset.

### Phase 6 — production pilot

Deliver:

- Configure isolated local, preview, staging, and production environments and
  databases. Preview must never mutate shared production data.
- Deploy the web app from protected `main` only after CI. Apply production
  migrations explicitly with an auditable, protected job; never on startup.
- Add a least-privilege scheduled/manual ingestion workflow with dry-run and
  source filters, protected environment secrets, and a concurrency group that
  prevents overlapping production imports.
- Add structured, privacy-safe logs and metrics for request rate/error/latency,
  DB pool health, data freshness, result gaps, ingestion counts/duration,
  inference cache/cost/failure, and review backlog.
- Alert on failed deploy smoke tests, repeated server errors, failed/stale or
  anomalous ingestion, DB exhaustion, and inference-budget breach.
- Add runbooks for provider outage/schema change, partial job and safe rerun,
  backfill/reprocess, migration/deploy recovery, backup restore, secret rotation,
  and tile/geocoder outage.
- Document security headers, outbound ingestion host allowlists, raw-data
  retention, provider/data attribution, credential rotation, backup/PITR tier,
  and application rollback/database forward-fix policy.

Complete when:

- Production smoke tests cover page load, health, a known nearby search, and a
  known detail response after deployment.
- A failed/partial ingestion drill preserves the prior public snapshot and its
  alert links to a usable runbook.
- A backup restore drill records recovery point and recovery time results before
  public launch and demonstrates the initial 24-hour RPO and four-hour RTO.
- Secret/dependency scanning has no unresolved high-severity finding, RLS tests
  pass for every table/view, and precise-location redaction is verified in the
  actual production telemetry configuration.

### Phase 7 — statewide New Jersey rollout

Deliver:

- Run the same adapter across the complete NJDEP source and compare counts to the
  upstream service.
- Review every low-confidence/unknown row and sample deterministic accepted rows.
- Fix only evidence-backed entity-resolution cases and keep corrections
  auditable.
- Load-test the statewide fixture and tune query/index/connection limits without
  changing API contracts.
- Publish data freshness and last-success status in operations monitoring.

Complete when:

- Two full reruns are logically identical, create no duplicate evidence, and
  make no unnecessary inference calls.
- Expected source counts and anomaly thresholds pass, the low-confidence queue
  is cleared or explicitly excluded, and every public fact has provenance.
- Golden quality, API latency/payload, mobile UX, privacy, restore, and freshness
  gates remain green at statewide size.

Initial ingestion guards fail an empty result, a total record-count change over
10%, or a quarantine/validation rate over 5% relative to the last published run;
they warn on a count change over 2%. Tune thresholds per source only after a
documented healthy baseline and manual review.

After this gate, implement New York lake and stream adapters in the source order
documented in [`data-sources-ny-nj.md`](data-sources-ny-nj.md). Treat each new
source as a new fixture-backed adapter and evidence policy, not as an extension
of NJ-specific code.

## Cross-cutting verification strategy

### Pull-request gates

- Frozen dependency install, formatting, linting, strict typecheck, and build.
- Unit tests for hashing, schemas, normalization, evidence/review rules, link
  sanitization, and privacy-safe logging.
- PostGIS integration tests for migrations, roles/RLS, repositories, spatial
  correctness, constraints, and index plans.
- Fixture-based adapter tests; no live NJDEP, geocoder, tile, or OpenRouter call.
- API contract tests and one mobile Playwright smoke journey.

### Scheduled and pre-release gates

- Provider contract smoke tests against live public sources, isolated from PR
  determinism.
- Golden-data comparison and source-count/freshness anomaly report.
- Statewide performance/load test and database connection-pool check.
- Browser/device and accessibility check of all geolocation fallback paths.
- Security/privacy configuration review, production smoke test, and restore
  evidence.

## Launch definition of done

The North Jersey pilot is ready for public use only when:

- A mobile user can use current location or search, see nearby water markers,
  and inspect understandable species evidence and provenance.
- All 20–50 pilot waters and accepted species associations have been manually
  reviewed against their source; there are no known unsupported associations.
- Two identical imports yield an identical public dataset and zero duplicate or
  unnecessary inference work.
- Missing, stale, stocking, listed, and surveyed data are labeled honestly.
- Precise coordinates are neither stored nor observable in logs and telemetry.
- CI, production smoke tests, privacy/RLS tests, source freshness monitoring,
  alerts, runbooks, and a restore drill are complete.
- The app remains useful from the last successful snapshot when public sources,
  geocoding, or OpenRouter are unavailable.

## Decisions required before implementation

Resolve these during Phase 0; they should not block repository scaffolding:

1. Tile/style and geocoder vendors, allowed origins, quotas, attribution, and
   production budget.
2. Supabase projects/regions and the local/preview/staging/production promotion
   model.
3. The named owner and refresh target for NJDEP data, plus raw-payload retention.
4. User-facing evidence terminology and the date to display when a source has a
   publication date but no observation date.
5. Pilot launch availability/SLO target and operational owner.

OpenRouter model selection is intentionally deferred until the deterministic
pilot exposes real unresolved examples. Choose and pin it with a prompt version,
fixture evaluation, structured-output support, latency/cost measurements, and a
documented fallback—not by general model preference.
