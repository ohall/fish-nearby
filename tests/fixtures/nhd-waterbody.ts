// Frozen upstream fixtures for the NJDEP NHD waterbody adapter.
// Shapes mirror the real Hydrography MapServer layer 33 (Waterbody 2015).

export const nhdWaterbodyPage = {
  features: [
    {
      attributes: {
        OBJECTID: 11,
        COMID: 9481,
        PERMANENT_IDENTIFIER: "{AAAA1111-0000-4000-8000-000000000001}",
        GNIS_ID: "00877238",
        GNIS_NAME: "Lake Hopatcong",
        FTYPE_DESCRIPTION: "Lake/Pond",
        AREASQKM: 4.5,
      },
      geometry: {
        rings: [
          [
            [-74.66, 40.95],
            [-74.63, 40.95],
            [-74.63, 40.92],
            [-74.66, 40.92],
            [-74.66, 40.95],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
    {
      // Second polygon of the same physical lake (same GNIS_ID).
      attributes: {
        OBJECTID: 12,
        COMID: 9482,
        PERMANENT_IDENTIFIER: "{AAAA1111-0000-4000-8000-000000000002}",
        GNIS_ID: "00877238",
        GNIS_NAME: "Lake Hopatcong",
        FTYPE_DESCRIPTION: "Lake/Pond",
        AREASQKM: 4.4,
      },
      geometry: {
        rings: [
          [
            [-74.62, 40.94],
            [-74.6, 40.94],
            [-74.6, 40.93],
            [-74.62, 40.93],
            [-74.62, 40.94],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
    {
      // Distinct water that shares a name with another feature.
      attributes: {
        OBJECTID: 13,
        COMID: 9483,
        PERMANENT_IDENTIFIER: "{AAAA1111-0000-4000-8000-000000000003}",
        GNIS_ID: "00878637",
        GNIS_NAME: "Mud Pond",
        FTYPE_DESCRIPTION: "Lake/Pond",
        AREASQKM: 0.2,
      },
      geometry: {
        rings: [
          [
            [-74.5, 41.1],
            [-74.49, 41.1],
            [-74.49, 41.09],
            [-74.5, 41.09],
            [-74.5, 41.1],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
    {
      attributes: {
        OBJECTID: 14,
        COMID: 9484,
        PERMANENT_IDENTIFIER: "{AAAA1111-0000-4000-8000-000000000004}",
        GNIS_ID: "00878636",
        GNIS_NAME: "Mud Pond",
        FTYPE_DESCRIPTION: "Lake/Pond",
        AREASQKM: 0.1,
      },
      geometry: {
        rings: [
          [
            [-74.02, 40.71],
            [-74.01, 40.71],
            [-74.01, 40.7],
            [-74.02, 40.7],
            [-74.02, 40.71],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
    {
      attributes: {
        OBJECTID: 15,
        COMID: 9485,
        PERMANENT_IDENTIFIER: "{AAAA1111-0000-4000-8000-000000000005}",
        GNIS_ID: "00881519",
        GNIS_NAME: "Wanaque Reservoir",
        FTYPE_DESCRIPTION: "Reservoir",
        AREASQKM: 9.1,
      },
      geometry: {
        rings: [
          [
            [-74.32, 41.05],
            [-74.28, 41.05],
            [-74.28, 41.02],
            [-74.32, 41.02],
            [-74.32, 41.05],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
  ],
  exceededTransferLimit: false,
};
