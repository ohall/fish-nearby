import type { FeatureCollection, Geometry } from "geojson";
import type { StyleSpecification } from "maplibre-gl";

function collection(
  features: FeatureCollection<Geometry>["features"],
): FeatureCollection<Geometry> {
  return { type: "FeatureCollection", features };
}

const northJerseyLand = collection([
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-75.02, 40.72],
          [-74.96, 40.86],
          [-74.86, 41.08],
          [-74.7, 41.34],
          [-74.24, 41.35],
          [-73.91, 41.18],
          [-74.02, 40.98],
          [-74.12, 40.82],
          [-74.3, 40.64],
          [-74.56, 40.62],
          [-74.82, 40.67],
          [-75.02, 40.72],
        ],
      ],
    },
  },
]);

const parks = collection([
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-74.53, 41.13],
          [-74.47, 41.24],
          [-74.35, 41.23],
          [-74.36, 41.12],
          [-74.53, 41.13],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-74.35, 41.0],
          [-74.31, 41.18],
          [-74.2, 41.17],
          [-74.19, 41.04],
          [-74.35, 41.0],
        ],
      ],
    },
  },
]);

const countyLines = collection([
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.83, 41.1],
        [-74.58, 41.07],
        [-74.36, 41.03],
        [-74.08, 41.01],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.67, 40.79],
        [-74.55, 40.93],
        [-74.58, 41.07],
        [-74.58, 41.28],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.36, 41.03],
        [-74.34, 40.88],
        [-74.3, 40.68],
      ],
    },
  },
]);

const waterways = collection([
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.16, 41.27],
        [-74.22, 41.18],
        [-74.25, 41.08],
        [-74.27, 40.99],
        [-74.21, 40.91],
        [-74.17, 40.82],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.49, 41.3],
        [-74.52, 41.19],
        [-74.59, 41.08],
        [-74.7, 40.95],
        [-74.78, 40.79],
      ],
    },
  },
]);

const roads = collection([
  {
    type: "Feature",
    properties: { class: "major" },
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.82, 40.89],
        [-74.58, 40.91],
        [-74.36, 40.9],
        [-74.07, 40.9],
      ],
    },
  },
  {
    type: "Feature",
    properties: { class: "major" },
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.57, 40.73],
        [-74.47, 40.86],
        [-74.37, 41.0],
        [-74.28, 41.14],
        [-74.2, 41.28],
      ],
    },
  },
  {
    type: "Feature",
    properties: { class: "major" },
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.12, 40.72],
        [-74.14, 40.91],
        [-74.17, 41.09],
        [-74.18, 41.28],
      ],
    },
  },
  {
    type: "Feature",
    properties: { class: "minor" },
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.69, 41.22],
        [-74.46, 41.15],
        [-74.3, 41.12],
        [-74.11, 41.04],
      ],
    },
  },
  {
    type: "Feature",
    properties: { class: "minor" },
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.76, 41.02],
        [-74.61, 40.96],
        [-74.43, 40.86],
        [-74.25, 40.79],
      ],
    },
  },
]);

const waterBodies = collection([
  {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-74.294, 41.153] },
  },
  {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-74.303, 41.116] },
  },
  {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-74.637, 40.955] },
  },
]);

export const localMapLabels = [
  { name: "Newark", coordinates: [-74.172, 40.735] as [number, number] },
  { name: "Morristown", coordinates: [-74.481, 40.796] as [number, number] },
  { name: "Paterson", coordinates: [-74.172, 40.917] as [number, number] },
  { name: "North Jersey", coordinates: [-74.52, 41.205] as [number, number] },
];

export function createLocalMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Fish Nearby local preview",
    sources: {
      "north-jersey-land": { type: "geojson", data: northJerseyLand },
      parks: { type: "geojson", data: parks },
      "county-lines": { type: "geojson", data: countyLines },
      waterways: { type: "geojson", data: waterways },
      roads: { type: "geojson", data: roads },
      "water-bodies": { type: "geojson", data: waterBodies },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#dce9ea" },
      },
      {
        id: "north-jersey-land",
        type: "fill",
        source: "north-jersey-land",
        paint: { "fill-color": "#f2f1e9", "fill-opacity": 1 },
      },
      {
        id: "parks",
        type: "fill",
        source: "parks",
        paint: { "fill-color": "#d9e5d4", "fill-opacity": 0.85 },
      },
      {
        id: "water-bodies",
        type: "circle",
        source: "water-bodies",
        paint: {
          "circle-color": "#b6dfe7",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 12, 24],
          "circle-stroke-color": "#9ccfd9",
          "circle-stroke-width": 1,
        },
      },
      {
        id: "waterways",
        type: "line",
        source: "waterways",
        paint: {
          "line-color": "#9ccfd9",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1, 12, 3],
        },
      },
      {
        id: "county-lines",
        type: "line",
        source: "county-lines",
        paint: {
          "line-color": "#c5c9c1",
          "line-width": 1,
          "line-dasharray": [3, 3],
        },
      },
      {
        id: "minor-roads",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "class"], "minor"],
        paint: { "line-color": "#ffffff", "line-width": 2 },
      },
      {
        id: "major-road-casing",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "class"], "major"],
        paint: { "line-color": "#dfb88f", "line-width": 4 },
      },
      {
        id: "major-roads",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "class"], "major"],
        paint: { "line-color": "#fff8e9", "line-width": 2 },
      },
      {
        id: "state-outline",
        type: "line",
        source: "north-jersey-land",
        paint: { "line-color": "#9aa9a4", "line-width": 1.5 },
      },
    ],
  };
}
