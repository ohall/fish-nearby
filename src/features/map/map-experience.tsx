"use client";

import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { MapWater } from "@/contracts";

const DEFAULT_CENTER: [number, number] = [-74.38, 41.07];
const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function FishMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5 14c4.4-6.1 10.1-7 15.5-2.8L25 8.5V19l-4.5-2.7C15.1 20.5 9.4 19.6 5 14Z" />
      <circle cx="16.8" cy="12.3" r="1" />
      <path d="M5 14 2.5 10v8L5 14Z" />
    </svg>
  );
}

function toFeatureCollection(
  waters: MapWater[],
): FeatureCollection<Point, { id: string; name: string }> {
  return {
    type: "FeatureCollection",
    features: waters.map((water) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          water.representativePoint.longitude,
          water.representativePoint.latitude,
        ],
      },
      properties: { id: water.id, name: water.displayName },
    })),
  };
}

function formatDistance(distanceMeters: number) {
  const miles = distanceMeters / 1_609.344;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away`;
}

function formatEvidenceType(evidenceType: string) {
  return evidenceType.replaceAll("_", " ");
}

export function MapExperience({ waters }: { waters: MapWater[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapReadyRef = useRef(false);
  const filteredWatersRef = useRef(waters);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<
    "loading" | "ready" | "error" | "unavailable"
  >("loading");
  const [locationMessage, setLocationMessage] = useState("");

  const filteredWaters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return waters;

    return waters.filter((water) =>
      `${water.displayName} ${water.county ?? ""} ${water.type} ${water.species.map((species) => species.commonName).join(" ")}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, waters]);

  const selectedWater = waters.find((water) => water.id === selectedId) ?? null;

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      typeof WebGLRenderingContext === "undefined"
    ) {
      setMapStatus("unavailable");
      return;
    }

    let disposed = false;
    let mapLoadTimer: ReturnType<typeof setTimeout> | undefined;

    async function initializeMap() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (disposed || !mapContainerRef.current) return;

        maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: 9.15,
          minZoom: 7,
          maxZoom: 16,
          attributionControl: false,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        mapReadyRef.current = false;
        mapLoadTimer = setTimeout(() => setMapStatus("error"), 15_000);
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-right",
        );
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "bottom-right",
        );

        map.on("style.load", () => {
          if (disposed) return;

          map.addSource("waters", {
            type: "geojson",
            data: toFeatureCollection(filteredWatersRef.current),
          });
          map.addLayer({
            id: "water-halo",
            type: "circle",
            source: "waters",
            paint: {
              "circle-radius": 14,
              "circle-color": "rgba(255, 255, 255, 0.8)",
              "circle-blur": 0.2,
            },
          });
          map.addLayer({
            id: "water-points",
            type: "circle",
            source: "waters",
            paint: {
              "circle-radius": 8,
              "circle-color": "#13231e",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "water-selected",
            type: "circle",
            source: "waters",
            filter: ["==", ["get", "id"], ""],
            paint: {
              "circle-radius": 15,
              "circle-color": "rgba(0, 0, 0, 0)",
              "circle-stroke-color": "#e76f3c",
              "circle-stroke-width": 4,
            },
          });
          map.addSource("current-location", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "current-location-pulse",
            type: "circle",
            source: "current-location",
            paint: {
              "circle-radius": 14,
              "circle-color": "rgba(238, 120, 75, 0.2)",
              "circle-stroke-color": "rgba(238, 120, 75, 0.45)",
              "circle-stroke-width": 1,
            },
          });
          map.addLayer({
            id: "current-location-point",
            type: "circle",
            source: "current-location",
            paint: {
              "circle-radius": 6,
              "circle-color": "#e76f3c",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });

          map.on("click", "water-points", (event) => {
            const id = event.features?.[0]?.properties.id as string | undefined;
            if (!id) return;

            const water = waters.find((candidate) => candidate.id === id);
            setSelectedId(id);
            if (water) {
              map.easeTo({
                center: [
                  water.representativePoint.longitude,
                  water.representativePoint.latitude,
                ],
                zoom: Math.max(map.getZoom(), 11),
                duration: 650,
              });
            }
          });
          map.on("mouseenter", "water-points", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "water-points", () => {
            map.getCanvas().style.cursor = "";
          });

          map.once("idle", () => {
            if (disposed) return;
            clearTimeout(mapLoadTimer);
            mapReadyRef.current = true;
            setMapStatus("ready");
          });
        });

        map.on("error", () => {
          if (!mapReadyRef.current) {
            clearTimeout(mapLoadTimer);
            setMapStatus("error");
          }
        });
      } catch {
        if (!disposed) setMapStatus("error");
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      clearTimeout(mapLoadTimer);
      mapReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [waters]);

  useEffect(() => {
    filteredWatersRef.current = filteredWaters;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const source = map.getSource("waters") as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(filteredWaters));
  }, [filteredWaters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("water-selected")) return;
    map.setFilter("water-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId]);

  function selectWater(water: MapWater) {
    setSelectedId(water.id);
    mapRef.current?.easeTo({
      center: [
        water.representativePoint.longitude,
        water.representativePoint.latitude,
      ],
      zoom: Math.max(mapRef.current.getZoom(), 11),
      duration: 650,
    });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstMatch = filteredWaters[0];
    if (firstMatch) selectWater(firstMatch);
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }

    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: FeatureCollection<Point> = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: [coords.longitude, coords.latitude],
              },
            },
          ],
        };
        const source = mapRef.current?.getSource(
          "current-location",
        ) as GeoJSONSource | null;
        source?.setData(point);
        mapRef.current?.easeTo({
          center: [coords.longitude, coords.latitude],
          zoom: 11.5,
          duration: 700,
        });
        setLocationMessage("Centered on your current location.");
      },
      () => setLocationMessage("We couldn’t access your location."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <main className="mapPage">
      <div
        ref={mapContainerRef}
        className="mapCanvas"
        role="application"
        aria-label="Interactive map of fishing waters in North Jersey"
        data-testid="map-canvas"
      />

      <header className="mapHeader">
        <div className="brandLockup" role="img" aria-label="Fish Nearby">
          <span className="srOnly">Fish Nearby</span>
          <Image
            className="brandLockupImage"
            src="/brand/horizontal-lockup-cream.png"
            width={500}
            height={242}
            alt=""
            priority
          />
          <Image
            className="brandIconImage"
            src="/brand/app-icon-cream-180.png"
            width={180}
            height={180}
            alt=""
            priority
          />
        </div>

        <form className="mapSearch" role="search" onSubmit={handleSearchSubmit}>
          <SearchIcon />
          <label className="srOnly" htmlFor="water-search">
            Search fishing waters
          </label>
          <input
            id="water-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lakes, reservoirs…"
            autoComplete="off"
          />
          <kbd>↵</kbd>
        </form>

        <button
          className="locationButton"
          type="button"
          onClick={requestLocation}
        >
          <LocateIcon />
          <span>Use my location</span>
        </button>
      </header>

      <p className="locationStatus" aria-live="polite">
        {locationMessage}
      </p>

      <aside className="waterRail" aria-label="Fishing waters">
        <div className="waterRailHeading">
          <span>
            <small>Explore nearby</small>
            <strong>{filteredWaters.length} waters</strong>
          </span>
          <span className="previewPill">Local database</span>
        </div>

        <div className="waterList">
          {filteredWaters.map((water, index) => (
            <button
              className={`waterCard${selectedId === water.id ? " isSelected" : ""}`}
              key={water.id}
              type="button"
              onClick={() => selectWater(water)}
              aria-pressed={selectedId === water.id}
            >
              <span className="waterNumber">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="waterCardCopy">
                <strong>{water.displayName}</strong>
                <small>
                  {water.county ? `${water.county}, NJ` : "New Jersey"} ·{" "}
                  {formatDistance(water.distanceMeters)}
                </small>
              </span>
              <span className="speciesCount">
                {water.species.length}
                <small>species</small>
              </span>
            </button>
          ))}

          {filteredWaters.length === 0 ? (
            <div className="emptyResults">
              <strong>No waters found</strong>
              <span>Try another water, county, or species name.</span>
            </div>
          ) : null}
        </div>
      </aside>

      {selectedWater ? (
        <section className="waterSheet" aria-labelledby="water-sheet-title">
          <button
            className="sheetClose"
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Close water details"
          >
            <CloseIcon />
          </button>

          <div className="sheetKicker">
            <span>{selectedWater.type}</span>
            <span>{formatDistance(selectedWater.distanceMeters)}</span>
          </div>
          <h1 id="water-sheet-title">{selectedWater.displayName}</h1>
          <p className="sheetLocation">
            {selectedWater.county
              ? `${selectedWater.county}, New Jersey`
              : "New Jersey"}
          </p>

          <div className="evidenceNotice">
            <strong>Public source data</strong>
            <span>Accepted NJDEP records loaded from the local database.</span>
          </div>

          <div className="speciesList">
            {selectedWater.species.map((species) => (
              <div className="speciesRow" key={species.id}>
                <span className="speciesIcon">
                  <FishMark />
                </span>
                <span>
                  <strong>{species.commonName}</strong>
                  <small>
                    {species.evidence[0]?.sourceLabel} ·{" "}
                    {formatEvidenceType(
                      species.evidence[0]?.evidenceType ?? "public record",
                    )}
                  </small>
                </span>
              </div>
            ))}

            {selectedWater.species.length === 0 ? (
              <div className="emptyResults">
                <strong>No accepted species evidence yet</strong>
                <span>
                  This water is mapped, but has no published fish record.
                </span>
              </div>
            ) : null}
          </div>

          <p className="representativeNote">
            Distance is measured to a representative point for this water.
          </p>
        </section>
      ) : null}

      <div className={`mapState mapState-${mapStatus}`} aria-live="polite">
        {mapStatus === "loading" ? "Loading map…" : null}
        {mapStatus === "error"
          ? "Map tiles unavailable — the database list still works."
          : null}
        {mapStatus === "unavailable" ? "Map preview requires WebGL." : null}
      </div>
    </main>
  );
}
