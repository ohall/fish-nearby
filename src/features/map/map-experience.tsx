"use client";

import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { PreviewWater } from "./preview-waters";

const DEFAULT_CENTER: [number, number] = [-74.38, 41.07];

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
  waters: PreviewWater[],
): FeatureCollection<Point, { id: string; name: string }> {
  return {
    type: "FeatureCollection",
    features: waters.map((water) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [water.longitude, water.latitude],
      },
      properties: { id: water.id, name: water.displayName },
    })),
  };
}

function getStyleUrl() {
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  return mapTilerKey
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
    : "https://demotiles.maplibre.org/style.json";
}

export function MapExperience({ waters }: { waters: PreviewWater[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
      `${water.displayName} ${water.county} ${water.type}`
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

    async function initializeMap() {
      const maplibregl = await import("maplibre-gl");
      if (disposed || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: getStyleUrl(),
        center: DEFAULT_CENTER,
        zoom: 9.15,
        minZoom: 7,
        maxZoom: 16,
        attributionControl: false,
        cooperativeGestures: true,
      });

      mapRef.current = map;
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      map.on("load", () => {
        if (disposed) return;

        map.addSource("preview-waters", {
          type: "geojson",
          data: toFeatureCollection(filteredWatersRef.current),
        });
        map.addLayer({
          id: "preview-water-halo",
          type: "circle",
          source: "preview-waters",
          paint: {
            "circle-radius": 14,
            "circle-color": "rgba(255, 255, 255, 0.8)",
            "circle-blur": 0.2,
          },
        });
        map.addLayer({
          id: "preview-water-points",
          type: "circle",
          source: "preview-waters",
          paint: {
            "circle-radius": 8,
            "circle-color": "#075f67",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "preview-water-selected",
          type: "circle",
          source: "preview-waters",
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-radius": 15,
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-stroke-color": "#ee784b",
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
            "circle-color": "#ee784b",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        map.on("click", "preview-water-points", (event) => {
          const id = event.features?.[0]?.properties.id as string | undefined;
          if (!id) return;

          const water = waters.find((candidate) => candidate.id === id);
          setSelectedId(id);
          if (water) {
            map.easeTo({
              center: [water.longitude, water.latitude],
              zoom: Math.max(map.getZoom(), 11),
              duration: 650,
            });
          }
        });
        map.on("mouseenter", "preview-water-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "preview-water-points", () => {
          map.getCanvas().style.cursor = "";
        });

        setMapStatus("ready");
      });

      map.on("error", () => {
        if (!map.isStyleLoaded()) setMapStatus("error");
      });
    }

    void initializeMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [waters]);

  useEffect(() => {
    filteredWatersRef.current = filteredWaters;
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const source = map.getSource("preview-waters") as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(filteredWaters));
  }, [filteredWaters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("preview-water-selected")) return;
    map.setFilter("preview-water-selected", [
      "==",
      ["get", "id"],
      selectedId ?? "",
    ]);
  }, [selectedId]);

  function selectWater(water: PreviewWater) {
    setSelectedId(water.id);
    mapRef.current?.easeTo({
      center: [water.longitude, water.latitude],
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
        aria-label="Interactive map of preview fishing waters in North Jersey"
        data-testid="map-canvas"
      />

      <header className="mapHeader">
        <div className="brandLockup">
          <span className="brandMark" role="img" aria-label="Fish Nearby">
            <FishMark />
          </span>
          <span>
            <strong>Fish Nearby</strong>
            <small>North Jersey preview</small>
          </span>
        </div>

        <form className="mapSearch" role="search" onSubmit={handleSearchSubmit}>
          <SearchIcon />
          <label className="srOnly" htmlFor="water-search">
            Search preview waters
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

      <aside className="waterRail" aria-label="Preview waters">
        <div className="waterRailHeading">
          <span>
            <small>Explore nearby</small>
            <strong>{filteredWaters.length} preview waters</strong>
          </span>
          <span className="previewPill">Fixture data</span>
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
                  {water.county} · {water.distanceLabel}
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
              <strong>No preview waters found</strong>
              <span>Try another lake or county name.</span>
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
            <span>{selectedWater.distanceLabel}</span>
          </div>
          <h1 id="water-sheet-title">{selectedWater.displayName}</h1>
          <p className="sheetLocation">{selectedWater.county}, New Jersey</p>

          <div className="evidenceNotice">
            <strong>UI preview</strong>
            <span>
              Species below are fixture content and are not yet verified.
            </span>
          </div>

          <div className="speciesList">
            {selectedWater.species.map((species) => (
              <div className="speciesRow" key={species.commonName}>
                <span className="speciesIcon">
                  <FishMark />
                </span>
                <span>
                  <strong>{species.commonName}</strong>
                  <small>{species.evidenceLabel}</small>
                </span>
              </div>
            ))}
          </div>

          <p className="representativeNote">
            Distance is measured to a representative point for this water.
          </p>
        </section>
      ) : null}

      <div className={`mapState mapState-${mapStatus}`} aria-live="polite">
        {mapStatus === "loading" ? "Loading map…" : null}
        {mapStatus === "error"
          ? "Basemap unavailable — preview list still works."
          : null}
        {mapStatus === "unavailable" ? "Map preview requires WebGL." : null}
      </div>
    </main>
  );
}
