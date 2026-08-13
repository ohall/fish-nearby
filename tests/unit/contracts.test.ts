import { describe, expect, it } from "vitest";

import {
  nearbyWaterSearchRequestSchema,
  nearbyWaterSearchResponseSchema,
  normalizedEvidenceSchema,
  sourceFetchPageSchema,
  waterDetailResponseSchema,
} from "@/contracts";

describe("public water contracts", () => {
  it("applies the nearby-search default radius", () => {
    expect(
      nearbyWaterSearchRequestSchema.parse({
        latitude: 41.031,
        longitude: -74.294,
      }),
    ).toEqual({
      latitude: 41.031,
      longitude: -74.294,
      radiusMeters: 25_000,
    });
  });

  it.each([
    { latitude: 91, longitude: 0, radiusMeters: 25_000 },
    { latitude: 0, longitude: -181, radiusMeters: 25_000 },
    { latitude: 0, longitude: 0, radiusMeters: 999 },
    { latitude: 0, longitude: 0, radiusMeters: 100_001 },
    { latitude: Number.NaN, longitude: 0, radiusMeters: 25_000 },
  ])("rejects an invalid nearby search: %j", (input) => {
    expect(nearbyWaterSearchRequestSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a map response containing only its public summary fields", () => {
    const response = nearbyWaterSearchResponseSchema.parse({
      waters: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          displayName: "Ramapo Lake",
          type: "lake",
          representativePoint: { latitude: 41.032, longitude: -74.251 },
          distanceMeters: 3_623.4,
          acceptedSpeciesCount: 2,
        },
      ],
    });

    expect(response.waters).toHaveLength(1);
    expect(response.waters[0]).not.toHaveProperty("rawImportId");
  });

  it("accepts grouped evidence detail without internal lineage", () => {
    const detail = waterDetailResponseSchema.parse({
      id: "20000000-0000-4000-8000-000000000001",
      displayName: "Ramapo Lake",
      type: "lake",
      state: "NJ",
      county: "Passaic",
      representativePoint: { latitude: 41.032, longitude: -74.251 },
      species: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          commonName: "Largemouth Bass",
          scientificName: "Micropterus salmoides",
          evidence: [
            {
              id: "30000000-0000-4000-8000-000000000001",
              evidenceType: "agency_listed_presence",
              sourceLabel: "Great Fishing Close to Home",
              sourceUrl: "https://example.com/source",
              publishedOn: "2026-08-12",
              confidenceTier: "high",
            },
          ],
        },
      ],
    });

    expect(detail.species[0]?.evidence[0]).not.toHaveProperty("inferenceId");
  });
});

describe("ingestion boundary contracts", () => {
  it("accepts a complete provider page with canonical artifact identity", () => {
    expect(
      sourceFetchPageSchema.parse({
        artifacts: [
          {
            sourceId: "00000000-0000-4000-8000-000000000001",
            artifactKey: "layer-121:42",
            fetchedAt: "2026-08-12T20:00:00Z",
            contentHash: "a".repeat(64),
            payload: { attributes: { OBJECTID: 42 } },
          },
        ],
        completeSnapshot: true,
      }).completeSnapshot,
    ).toBe(true);
  });

  it("rejects invalid hashes and coordinates before persistence", () => {
    const result = normalizedEvidenceSchema.safeParse({
      sourceId: "00000000-0000-4000-8000-000000000001",
      sourceEvidenceKey: "layer-122:42:largemouth-bass",
      rawImportId: "not-a-uuid",
      waterBodyId: "20000000-0000-4000-8000-000000000001",
      speciesId: "10000000-0000-4000-8000-000000000001",
      evidenceType: "agency_listed_presence",
      extractionMethod: "structured_source",
      confidenceTier: "high",
      reviewState: "accepted",
    });

    expect(result.success).toBe(false);
  });
});
