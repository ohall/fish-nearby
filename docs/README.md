# Implementation Guide

One page per MVP todo item.

## Bootstrap
- [Create Next.js + TypeScript app](todos/01-create-next-js-typescript-app.md)
- [Add MapLibre map](todos/02-add-maplibre-map.md)
- [Add mobile geolocation](todos/03-add-mobile-geolocation.md)
- [Add location search](todos/04-add-location-search.md)
- [Provision PostgreSQL with PostGIS](todos/05-provision-postgresql-with-postgis.md)
- [Add DB migrations / ORM](todos/06-add-db-migrations-orm.md)

## Core data model
- [`water_body` table with name, type, state, geometry](todos/07-water-body-table-with-name-type-state-geometry.md)
- [`species` canonical taxonomy table](todos/08-species-canonical-taxonomy-table.md)
- [`water_body_species` relationship with provenance and confidence](todos/09-water-body-species-relationship-with-provenance-and-confidence.md)
- [`source` table](todos/10-source-table.md)
- [`raw_import` table for original source payloads](todos/11-raw-import-table-for-original-source-payloads.md)
- [`inference` table with model, prompt version, input hash, and output](todos/12-inference-table-with-model-prompt-version-input-hash-and-output.md)

## API
- [`GET /waters?lat=&lng=&radius=`](todos/13-get-waters-lat-lng-radius.md)
- [`GET /waters/:id`](todos/14-get-waters-id.md)
- [Return species, confidence, and source metadata](todos/15-return-species-confidence-and-source-metadata.md)
- [Add PostGIS spatial index](todos/16-add-postgis-spatial-index.md)

## Ingestion
- [Define minimal `Source.fetch()` interface](todos/17-define-minimal-source-fetch-interface.md)
- [Build first NJ public-data source adapter](todos/18-build-first-nj-public-data-source-adapter.md)
- [Store raw source artifacts before normalization](todos/19-store-raw-source-artifacts-before-normalization.md)
- [Hash artifacts to avoid duplicate processing](todos/20-hash-artifacts-to-avoid-duplicate-processing.md)
- [Make ingestion idempotent](todos/21-make-ingestion-idempotent.md)

## OpenRouter normalization
- [Structured-output client](todos/22-structured-output-client.md)
- [Infer water-body name/type/location from source records](todos/23-infer-water-body-name-type-location-from-source-records.md)
- [Normalize fish names to canonical species](todos/24-normalize-fish-names-to-canonical-species.md)
- [Resolve ambiguous water bodies against nearby DB candidates](todos/25-resolve-ambiguous-water-bodies-against-nearby-db-candidates.md)
- [Cache inference by input hash + prompt version + model](todos/26-cache-inference-by-input-hash-prompt-version-model.md)
- [Validate inference output deterministically](todos/27-validate-inference-output-deterministically.md)
- [Add confidence thresholds / review state](todos/28-add-confidence-thresholds-review-state.md)

## Map MVP
- [Center map on current location](todos/29-center-map-on-current-location.md)
- [Query nearby water bodies](todos/30-query-nearby-water-bodies.md)
- [Render simple markers first](todos/31-render-simple-markers-first.md)
- [Tap marker to show species list](todos/32-tap-marker-to-show-species-list.md)
- [Show source and observation date](todos/33-show-source-and-observation-date.md)
- [Handle empty / unknown data clearly](todos/34-handle-empty-unknown-data-clearly.md)

## First useful dataset
- [Load 20-50 North Jersey water bodies](todos/35-load-20-50-north-jersey-water-bodies.md)
- [Verify species results manually](todos/36-verify-species-results-manually.md)
- [Fix entity-resolution edge cases](todos/37-fix-entity-resolution-edge-cases.md)
- [Expand to all NJ once the pipeline works](todos/38-expand-to-all-nj-once-the-pipeline-works.md)

