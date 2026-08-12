# TODO

Each item links to its implementation page.

## Bootstrap
- [ ] [Create Next.js + TypeScript app](docs/todos/01-create-next-js-typescript-app.md)
- [ ] [Add MapLibre map](docs/todos/02-add-maplibre-map.md)
- [ ] [Add mobile geolocation](docs/todos/03-add-mobile-geolocation.md)
- [ ] [Add location search](docs/todos/04-add-location-search.md)
- [ ] [Provision PostgreSQL with PostGIS](docs/todos/05-provision-postgresql-with-postgis.md)
- [ ] [Add DB migrations / ORM](docs/todos/06-add-db-migrations-orm.md)

## Core data model
- [ ] [`water_body` table with name, type, state, geometry](docs/todos/07-water-body-table-with-name-type-state-geometry.md)
- [ ] [`species` canonical taxonomy table](docs/todos/08-species-canonical-taxonomy-table.md)
- [ ] [`water_body_species` relationship with provenance and confidence](docs/todos/09-water-body-species-relationship-with-provenance-and-confidence.md)
- [ ] [`source` table](docs/todos/10-source-table.md)
- [ ] [`raw_import` table for original source payloads](docs/todos/11-raw-import-table-for-original-source-payloads.md)
- [ ] [`inference` table with model, prompt version, input hash, and output](docs/todos/12-inference-table-with-model-prompt-version-input-hash-and-output.md)

## API
- [ ] [`GET /waters?lat=&lng=&radius=`](docs/todos/13-get-waters-lat-lng-radius.md)
- [ ] [`GET /waters/:id`](docs/todos/14-get-waters-id.md)
- [ ] [Return species, confidence, and source metadata](docs/todos/15-return-species-confidence-and-source-metadata.md)
- [ ] [Add PostGIS spatial index](docs/todos/16-add-postgis-spatial-index.md)

## Ingestion
- [ ] [Define minimal `Source.fetch()` interface](docs/todos/17-define-minimal-source-fetch-interface.md)
- [ ] [Build first NJ public-data source adapter](docs/todos/18-build-first-nj-public-data-source-adapter.md)
- [ ] [Store raw source artifacts before normalization](docs/todos/19-store-raw-source-artifacts-before-normalization.md)
- [ ] [Hash artifacts to avoid duplicate processing](docs/todos/20-hash-artifacts-to-avoid-duplicate-processing.md)
- [ ] [Make ingestion idempotent](docs/todos/21-make-ingestion-idempotent.md)

## OpenRouter normalization
- [ ] [Structured-output client](docs/todos/22-structured-output-client.md)
- [ ] [Infer water-body name/type/location from source records](docs/todos/23-infer-water-body-name-type-location-from-source-records.md)
- [ ] [Normalize fish names to canonical species](docs/todos/24-normalize-fish-names-to-canonical-species.md)
- [ ] [Resolve ambiguous water bodies against nearby DB candidates](docs/todos/25-resolve-ambiguous-water-bodies-against-nearby-db-candidates.md)
- [ ] [Cache inference by input hash + prompt version + model](docs/todos/26-cache-inference-by-input-hash-prompt-version-model.md)
- [ ] [Validate inference output deterministically](docs/todos/27-validate-inference-output-deterministically.md)
- [ ] [Add confidence thresholds / review state](docs/todos/28-add-confidence-thresholds-review-state.md)

## Map MVP
- [ ] [Center map on current location](docs/todos/29-center-map-on-current-location.md)
- [ ] [Query nearby water bodies](docs/todos/30-query-nearby-water-bodies.md)
- [ ] [Render simple markers first](docs/todos/31-render-simple-markers-first.md)
- [ ] [Tap marker to show species list](docs/todos/32-tap-marker-to-show-species-list.md)
- [ ] [Show source and observation date](docs/todos/33-show-source-and-observation-date.md)
- [ ] [Handle empty / unknown data clearly](docs/todos/34-handle-empty-unknown-data-clearly.md)

## First useful dataset
- [ ] [Load 20-50 North Jersey water bodies](docs/todos/35-load-20-50-north-jersey-water-bodies.md)
- [ ] [Verify species results manually](docs/todos/36-verify-species-results-manually.md)
- [ ] [Fix entity-resolution edge cases](docs/todos/37-fix-entity-resolution-edge-cases.md)
- [ ] [Expand to all NJ once the pipeline works](docs/todos/38-expand-to-all-nj-once-the-pipeline-works.md)

## Not MVP
- End-user accounts
- Catch logging
- Social features
- Fishing forecasts
- Weather
- Tackle recommendations
- Notifications
- Native mobile app
- Offline maps
