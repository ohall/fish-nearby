import { describe, expect, it } from "vitest";

import {
  normalizeArtifacts,
  normalizeName,
  normalizeNhdArtifacts,
  normalizeNjDepArtifacts,
  type SpeciesIndex,
} from "@/server/ingestion/normalize";
import type { SourceArtifact } from "@/contracts";

const SOURCE_ID = "00000000-0000-4000-8000-000000000001";
const NHD_SOURCE_ID = "00000000-0000-4000-8000-000000000002";

const speciesIndex: SpeciesIndex = {
  byNormalizedName: new Map([
    ["largemouth bass", "10000000-0000-4000-8000-000000000001"],
    ["bluegill", "10000000-0000-4000-8000-000000000013"],
  ]),
};

function artifact(key: string, payload: unknown): SourceArtifact {
  return {
    sourceId: SOURCE_ID,
    artifactKey: key,
    fetchedAt: "2026-08-17T00:00:00Z",
    contentHash: "a".repeat(64),
    payload: payload as SourceArtifact["payload"],
  };
}

describe("normalizeName", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeName("  Ramapo   Lake! ")).toBe("ramapo lake");
  });
});

describe("normalizeNjDepArtifacts", () => {
  it("maps a water point and its game-fish rows deterministically", () => {
    const artifacts: SourceArtifact[] = [
      artifact("layer-121:ramapo-lake", {
        attributes: {
          WATERBODY: "Ramapo Lake",
          COUNTY: "Passaic",
          LATDD: 41.032,
          LONDD: -74.251,
        },
        geometry: { x: -74.251, y: 41.032 },
      }),
      artifact("layer-122:ramapo-lake:0", {
        attributes: { COMMON_NAME: "Largemouth Bass" },
      }),
      artifact("layer-122:ramapo-lake:1", {
        attributes: { COMMON_NAME: "Bluegill" },
      }),
      artifact("layer-122:ramapo-lake:2", {
        attributes: { COMMON_NAME: "Mystery Fish" },
      }),
    ];

    const result = normalizeNjDepArtifacts(artifacts, speciesIndex);

    expect(result.waterBodies).toHaveLength(1);
    expect(result.waterBodies[0]).toMatchObject({
      externalId: "ramapo-lake",
      normalizedName: "ramapo lake",
      displayName: "Ramapo Lake",
      type: "lake",
      state: "NJ",
      county: "Passaic",
      reviewState: "accepted",
      confidenceTier: "high",
    });

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence.map((e) => e.speciesId).sort()).toEqual([
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000013",
    ]);
    expect(result.evidence[0]?.evidenceType).toBe("agency_listed_presence");
    expect(result.evidence[0]?.extractionMethod).toBe("structured_source");

    // unknown species quarantined
    expect(result.quarantined).toEqual(["layer-122:ramapo-lake:2"]);
  });

  it("quarantines a water point with missing coordinates", () => {
    const artifacts: SourceArtifact[] = [
      artifact("layer-121:no-coords", {
        attributes: { WATERBODY: "No Coords Lake" },
        geometry: {},
      }),
    ];
    const result = normalizeNjDepArtifacts(artifacts, speciesIndex);
    expect(result.waterBodies).toHaveLength(0);
    expect(result.quarantined).toEqual(["layer-121:no-coords"]);
  });
});

function nhdArtifact(
  featureId: string,
  attributes: Record<string, unknown>,
  rings: number[][][] | undefined,
): SourceArtifact {
  return {
    sourceId: NHD_SOURCE_ID,
    artifactKey: `nhd-waterbody:${featureId}`,
    fetchedAt: "2026-08-18T00:00:00Z",
    contentHash: "b".repeat(64),
    payload: { attributes, geometry: { rings } } as SourceArtifact["payload"],
  };
}

function square(west: number, south: number, size: number): number[][][] {
  return [
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
      [west, south],
    ],
  ];
}

describe("normalizeNhdArtifacts", () => {
  it("merges split polygons of one physical water by GNIS_ID", () => {
    const artifacts = [
      nhdArtifact(
        "perm-1",
        {
          GNIS_ID: "00877238",
          GNIS_NAME: "Lake Hopatcong",
          FTYPE_DESCRIPTION: "Lake/Pond",
        },
        square(-74.66, 40.92, 0.03),
      ),
      nhdArtifact(
        "perm-2",
        {
          GNIS_ID: "00877238",
          GNIS_NAME: "Lake Hopatcong",
          FTYPE_DESCRIPTION: "Lake/Pond",
        },
        square(-74.62, 40.93, 0.01),
      ),
    ];

    const result = normalizeNhdArtifacts(artifacts);

    expect(result.waterBodies).toHaveLength(1);
    expect(result.evidence).toHaveLength(0);
    expect(result.waterBodies[0]).toMatchObject({
      sourceId: NHD_SOURCE_ID,
      externalId: "00877238",
      normalizedName: "lake hopatcong",
      displayName: "Lake Hopatcong",
      type: "lake",
      state: "NJ",
      reviewState: "accepted",
    });
    // Centroid comes from the largest polygon.
    expect(result.waterBodies[0]?.longitude).toBeCloseTo(-74.645, 3);
    expect(result.waterBodies[0]?.latitude).toBeCloseTo(40.935, 3);
  });

  it("keeps distinct same-name waters as separate rows with clean display names", () => {
    const artifacts = [
      nhdArtifact(
        "perm-1",
        {
          GNIS_ID: "00878637",
          GNIS_NAME: "Mud Pond",
          FTYPE_DESCRIPTION: "Lake/Pond",
        },
        square(-74.5, 41.09, 0.01),
      ),
      nhdArtifact(
        "perm-2",
        {
          GNIS_ID: "00878636",
          GNIS_NAME: "Mud Pond",
          FTYPE_DESCRIPTION: "Lake/Pond",
        },
        square(-74.02, 40.7, 0.02),
      ),
    ];

    const result = normalizeNhdArtifacts(artifacts);

    expect(result.waterBodies).toHaveLength(2);
    // Largest area keeps the bare name; ties/smaller get a stable suffix.
    const byExternal = new Map(
      result.waterBodies.map((w) => [w.externalId, w]),
    );
    expect(byExternal.get("00878636")?.normalizedName).toBe("mud pond");
    expect(byExternal.get("00878637")?.normalizedName).toBe(
      "mud pond ~00878637",
    );
    expect(result.waterBodies.map((w) => w.displayName)).toEqual([
      "Mud Pond",
      "Mud Pond",
    ]);
  });

  it("maps NHD FTYPE reservoir and quarantines features without name or geometry", () => {
    const artifacts = [
      nhdArtifact(
        "perm-1",
        {
          GNIS_ID: "00881519",
          GNIS_NAME: "Wanaque Reservoir",
          FTYPE_DESCRIPTION: "Reservoir",
        },
        square(-74.32, 41.02, 0.04),
      ),
      nhdArtifact(
        "perm-2",
        { GNIS_ID: "x", FTYPE_DESCRIPTION: "Lake/Pond" },
        square(-74, 41, 0.01),
      ),
      nhdArtifact(
        "perm-3",
        { GNIS_ID: "y", GNIS_NAME: "No Geom Lake" },
        undefined,
      ),
    ];

    const result = normalizeNhdArtifacts(artifacts);

    expect(result.waterBodies).toHaveLength(1);
    expect(result.waterBodies[0]?.type).toBe("reservoir");
    expect(result.quarantined).toEqual([
      "nhd-waterbody:perm-2",
      "nhd-waterbody:perm-3",
    ]);
  });
});

describe("normalizeArtifacts", () => {
  it("routes both artifact schemes and merges results", () => {
    const artifacts: SourceArtifact[] = [
      artifact("layer-121:ramapo-lake", {
        attributes: { WATERBODY: "Ramapo Lake", COUNTY: "Passaic" },
        geometry: { x: -74.251, y: 41.032 },
      }),
      nhdArtifact(
        "perm-1",
        {
          GNIS_ID: "00877238",
          GNIS_NAME: "Lake Hopatcong",
          FTYPE_DESCRIPTION: "Lake/Pond",
        },
        square(-74.66, 40.92, 0.03),
      ),
    ];

    const result = normalizeArtifacts(artifacts, speciesIndex);

    expect(result.waterBodies.map((w) => w.displayName).sort()).toEqual([
      "Lake Hopatcong",
      "Ramapo Lake",
    ]);
  });
});
