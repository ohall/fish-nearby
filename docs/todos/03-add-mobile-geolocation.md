# Add mobile geolocation

## Technology

**Browser Geolocation API + MapLibre GeolocateControl**

## How it works

The browser requests location permission and returns latitude/longitude; MapLibre centers the map and can show the user location dot.

## MVP implementation

- HTTPS is required in production.
- Treat permission denial as normal.
- Fallback to location search.
- Do not persist precise location for the MVP.

## Done when

The item works end-to-end in the deployed MVP and has a focused verification path without leaking source-specific behavior into unrelated layers.

[Back to TODO](../../TODO.md)
