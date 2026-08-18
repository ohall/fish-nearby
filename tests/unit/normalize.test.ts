import { describe, expect, it } from "vitest";

import {
  normalizeName,
  normalizeNjDepArtifacts,
  type SpeciesIndex,
} from "@/server/ingestion/normalize";
import type { SourceArtifact } from "@/contracts";

const SOURCE_ID = "00000000-0000-4000-8000-000000000001";

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
