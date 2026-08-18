// Frozen upstream fixtures for the NJDEP ArcGIS adapter.
// Shapes mirror the real Great Fishing Close to Home service.

export const pointLayerPage = {
  features: [
    {
      attributes: {
        OBJECTID: 1,
        ID: "ramapo-lake",
        WATERBODY: "Ramapo Lake",
        GNIS_NAME: "Ramapo Lake",
        COUNTY: "Passaic",
        LATDD: 41.032,
        LONDD: -74.251,
        ACRES: 120,
      },
      geometry: { x: -74.251, y: 41.032, spatialReference: { wkid: 4326 } },
    },
    {
      attributes: {
        OBJECTID: 2,
        ID: "wawayanda-creek",
        WATERBODY: "Wawayanda Creek",
        COUNTY: "Sussex",
        LATDD: 41.2,
        LONDD: -74.4,
        ACRES: 0,
      },
      geometry: { x: -74.4, y: 41.2, spatialReference: { wkid: 4326 } },
    },
  ],
  exceededTransferLimit: false,
};

export const relatedGameFishRamapo = {
  relatedRecordGroups: [
    {
      objectId: 1,
      relatedRecords: [
        { attributes: { OBJECTID: 101, COMMON_NAME: "Largemouth Bass" } },
        { attributes: { OBJECTID: 102, COMMON_NAME: "Bluegill" } },
      ],
    },
  ],
};

export const relatedGameFishWawayanda = {
  relatedRecordGroups: [
    {
      objectId: 2,
      relatedRecords: [
        { attributes: { OBJECTID: 103, COMMON_NAME: "Brook Trout" } },
      ],
    },
  ],
};
