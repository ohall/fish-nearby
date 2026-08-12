# Render simple markers first

## Technology

**MapLibre GeoJSON source + layer**

## How it works

Point features are enough to prove the product and are much simpler than handling all lake and river geometries.

## MVP implementation

- Use one FeatureCollection.
- Prefer map layers over many DOM markers.
- Cluster only if needed.
- Keep marker styling simple.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
