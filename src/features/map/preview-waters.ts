export type PreviewSpecies = {
  commonName: string;
  evidenceLabel: string;
};

export type PreviewWater = {
  id: string;
  displayName: string;
  type: "lake" | "reservoir";
  county: string;
  longitude: number;
  latitude: number;
  distanceLabel: string;
  species: PreviewSpecies[];
};

export const previewWaters: PreviewWater[] = [
  {
    id: "ramapo-lake",
    displayName: "Ramapo Lake",
    type: "lake",
    county: "Passaic County",
    longitude: -74.251,
    latitude: 41.032,
    distanceLabel: "6 mi away",
    species: [
      {
        commonName: "Largemouth bass",
        evidenceLabel: "Example agency listing",
      },
      { commonName: "Chain pickerel", evidenceLabel: "Example agency listing" },
      { commonName: "Sunfish", evidenceLabel: "Example agency listing" },
    ],
  },
  {
    id: "monksville-reservoir",
    displayName: "Monksville Reservoir",
    type: "reservoir",
    county: "Passaic County",
    longitude: -74.303,
    latitude: 41.116,
    distanceLabel: "9 mi away",
    species: [
      { commonName: "Muskellunge", evidenceLabel: "Example stocking record" },
      { commonName: "Walleye", evidenceLabel: "Example agency listing" },
      {
        commonName: "Smallmouth bass",
        evidenceLabel: "Example agency listing",
      },
    ],
  },
  {
    id: "greenwood-lake",
    displayName: "Greenwood Lake",
    type: "lake",
    county: "Passaic County",
    longitude: -74.294,
    latitude: 41.153,
    distanceLabel: "12 mi away",
    species: [
      {
        commonName: "Largemouth bass",
        evidenceLabel: "Example agency listing",
      },
      { commonName: "Yellow perch", evidenceLabel: "Example agency listing" },
      {
        commonName: "Channel catfish",
        evidenceLabel: "Example agency listing",
      },
    ],
  },
  {
    id: "wawayanda-lake",
    displayName: "Wawayanda Lake",
    type: "lake",
    county: "Sussex County",
    longitude: -74.428,
    latitude: 41.18,
    distanceLabel: "18 mi away",
    species: [
      { commonName: "Brown trout", evidenceLabel: "Example stocking record" },
      { commonName: "Rainbow trout", evidenceLabel: "Example stocking record" },
      {
        commonName: "Largemouth bass",
        evidenceLabel: "Example agency listing",
      },
    ],
  },
  {
    id: "lake-hopatcong",
    displayName: "Lake Hopatcong",
    type: "lake",
    county: "Morris & Sussex counties",
    longitude: -74.637,
    latitude: 40.955,
    distanceLabel: "24 mi away",
    species: [
      {
        commonName: "Hybrid striped bass",
        evidenceLabel: "Example stocking record",
      },
      { commonName: "Walleye", evidenceLabel: "Example stocking record" },
      { commonName: "Black crappie", evidenceLabel: "Example agency listing" },
    ],
  },
];
