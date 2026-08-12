# ADR 0001: Map tiles and geocoding providers

- Status: Accepted for the North Jersey pilot
- Date: 2026-08-12

## Decision

Use MapLibre GL JS as the browser renderer, MapTiler for the initial hosted map
style and tiles, and a server-side geocoder adapter whose first production
provider will be selected after quota and privacy testing. Do not call the
public Nominatim service for production autocomplete.

MapTiler's browser key is configuration, not a secret, but production and
preview keys must be separate and restricted to their exact allowed origins.
The map must show the provider's required attribution. If the style cannot be
loaded, the page keeps search and water detail functionality available and
shows a plain-language map error.

The geocoder adapter accepts only the search text needed for the request, uses
a bounded timeout and result count, and does not retain queries. The browser
calls the application adapter rather than a provider directly. This keeps
provider-specific payloads and credentials out of UI code and permits a provider
change without changing the public application contract.

## Rationale

MapLibre avoids coupling the app to a proprietary renderer. MapTiler provides a
fast path to a production basemap and documents attribution and origin
restriction controls. Deferring the geocoder vendor prevents a placeholder
choice from becoming a privacy or quota commitment before real pilot traffic is
measured.

## Operational requirements

- Record expected monthly tile and geocoding volume before public launch.
- Configure quota alerts and a hard spending limit where the provider supports
  one.
- Restrict browser keys by HTTPS origin; keep server credentials outside
  `NEXT_PUBLIC_*` variables.
- Send no precise browser location to tile or geocoding providers unless their
  service strictly requires it for the user-requested operation.
- Review provider terms, attribution wording, CORS behavior, retention, and
  subprocessors before production approval.
- Keep the North Jersey default view usable when geolocation, geocoding, or map
  tiles are unavailable.

## Revisit trigger

Re-evaluate the providers before Phase 4 begins and whenever pricing, terms,
privacy behavior, coverage, or reliability no longer meet the pilot needs.
