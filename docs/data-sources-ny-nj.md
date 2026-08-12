# NY & NJ Fishing Data Sources

Verified against official public sources on 2026-08-12.

Prefer structured government datasets and preserve the original record/provenance even when OpenRouter helps normalize it.

## New Jersey

### NJDEP Great Fishing Close to Home — primary MVP source

This is the best first source: roughly 291 publicly accessible water bodies selected by NJ Fish & Wildlife, with primary game-fish species plus access/amenity data.

Point layer:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental/MapServer/121`

Polygon layer:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental/MapServer/120`

Related Game Fish table:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental/MapServer/122`

Useful point-layer fields include `WATERBODY`, `GNIS_NAME`, `LATDD`, `LONDD`, `ACRES`, access fields, and stable `ID`. Layer 121 has a Game Fish relationship to table 122.

Typical query shape:
`.../121/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&outSR=4326`

For the MVP, ingest the point layer first and load related species records.

Official overview:
`https://www.arcgis.com/home/item.html?id=6d2025b0b45444038a63366b81c7fab0`

### NJ trout-stocked lakes, ponds and reservoirs

Polygon layer:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_admin/MapServer/36`

Centroid layer:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_admin/MapServer/33`

Stocking schedule:
`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_admin/MapServer/37`

Treat this as dated **stocking evidence**, not permanent proof of current fish presence.

### NJ trout-stocked streams

Feature service:
`https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/ArcGIS/rest/services/Trout_Stocked_Streams_in_New_Jersey/FeatureServer`

- midpoint layer `50`
- stream line layer `51`

### NJ freshwater regulation water bodies

`https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/arcgis/rest/services/Freshwater_Fishing_Regulation_Waterbodies/FeatureServer`

- waterbody layer `11`
- species-regulation table `124`

Useful for geometry/regulations. A species appearing in a regulation is **not** direct evidence that it occurs in that exact water body.

### NJ freshwater regulation streams

`https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/ArcGIS/rest/services/Freshwater_Fishing_Regulation_Streams/FeatureServer`

- stream layer `9`
- species-regulation table `123`

## New York

New York Open Data uses Socrata. Dataset ID `abcd-1234` is generally queryable as:
`https://data.ny.gov/resource/abcd-1234.json`

Socrata supports `$select`, `$where`, `$limit`, `$offset`, etc.

### Recommended Fishing Lakes and Ponds — primary NY lake source

Dataset ID: `mw8j-wduf`

API:
`https://data.ny.gov/resource/mw8j-wduf.json`

Dataset:
`https://data.ny.gov/Recreation/Recommended-Fishing-Lakes-and-Ponds/mw8j-wduf`

Important fields:
- `water`
- `fish_speci`
- `county`
- `point_x`, `point_y`
- boat launch/access fields
- regulations/waterbody links

The official page reports 320 rows; underlying data was last updated 2024-12-27.

### Recommended Fishing Rivers and Streams — primary NY river source

Dataset ID: `jcxg-7gnm`

API:
`https://data.ny.gov/resource/jcxg-7gnm.json`

Dataset:
`https://data.ny.gov/Recreation/Recommended-Fishing-Rivers-And-Streams/jcxg-7gnm`

Important fields:
- `name`
- `fish_spec`
- `county`
- `public_acc`
- `access_own`
- `point_x`, `point_y`
- `spec_regs`
- `site_wl`

The official page reports 546 rows; underlying data was last updated 2025-01-16.

### Actual Fish Stocking — beginning 2011

Dataset ID: `e52k-ymww`

API:
`https://data.ny.gov/resource/e52k-ymww.json`

Dataset:
`https://data.ny.gov/Recreation/Fish-Stocking-Lists-Actual-Beginning-2011/e52k-ymww`

Fields include year, county, waterbody, town, month, number, species, and size. Updated 2026-06-24.

### Current-season spring trout stocking

Dataset ID: `d9y2-n436`

API:
`https://data.ny.gov/resource/d9y2-n436.json`

Use it for recent stocking and keep the historical actual-stockings dataset for long-term evidence.

## Recommended ingestion order

1. NJ Great Fishing Close to Home
2. NY Recommended Fishing Lakes and Ponds
3. NY Recommended Fishing Rivers and Streams
4. NJ trout stocking
5. NY stocking datasets
6. Later: surveys, reports, PDFs, and general web sources

The first three may already prove the product because they directly encode **water body → fish species**.

## Evidence types

Keep the semantics explicit:
- `agency_recommended_presence`
- `agency_listed_presence`
- `stocking`
- `survey`
- `report`

Record document inference through an extraction method such as `llm_document`,
not as an evidence type. The evidence type must retain what the underlying
document claims (for example, `stocking`, `survey`, or `report`) regardless of
whether code or an LLM extracts it.
