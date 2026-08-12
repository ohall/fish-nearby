# Add location search

## Technology

**Geocoder adapter**

## How it works

A geocoder turns `Lake Placid, NY` or an address into coordinates so travelers can explore places they are not currently standing in.

## MVP implementation

- Define `Geocoder.search(text)`.
- Return label/lat/lng/bounds.
- Hide provider-specific response shapes.
- Cache repeated lookups if useful.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
