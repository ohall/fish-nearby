import { describe, expect, it } from "vitest";

import type { HttpClient } from "@/server/ingestion/http";
import { NjDepArcGisAdapter } from "@/server/ingestion/njdep-arcgis";
import {
  pointLayerPage,
  relatedGameFishRamapo,
  relatedGameFishWawayanda,
} from "../fixtures/njdep-arcgis";

function makeClient(
  overrides: Partial<Record<string, unknown>> = {},
): HttpClient {
  return async ({ url, searchParams }) => {
    if (url.endsWith("/121/query")) {
      return { status: 200, json: pointLayerPage };
    }
    if (url.endsWith("/121/queryRelatedRecords")) {
      const objectId = String(searchParams?.objectIds);
      if (objectId === "1") return { status: 200, json: relatedGameFishRamapo };
      if (objectId === "2")
        return { status: 200, json: relatedGameFishWawayanda };
      return { status: 200, json: { relatedRecordGroups: [] } };
    }
    return { status: 200, json: overrides };
  };
}

describe("NjDepArcGisAdapter", () => {
  it("emits one raw artifact per water and per related game-fish row", async () => {
    const adapter = new NjDepArcGisAdapter({
      httpClient: makeClient(),
      now: () => new Date("2026-08-17T00:00:00Z"),
    });
    const result = await adapter.fetch();

    // 2 waters + 2 + 1 game-fish rows
    expect(result.artifacts).toHaveLength(5);
    expect(result.completeSnapshot).toBe(true);

    const keys = result.artifacts.map((a) => a.artifactKey).sort();
    expect(keys).toEqual([
      "layer-121:ramapo-lake",
      "layer-121:wawayanda-creek",
      "layer-122:ramapo-lake:0",
      "layer-122:ramapo-lake:1",
      "layer-122:wawayanda-creek:0",
    ]);
  });

  it("uses a deterministic content hash and stable artifact keys", async () => {
    const make = () =>
      new NjDepArcGisAdapter({
        httpClient: makeClient(),
        now: () => new Date("2026-08-17T00:00:00Z"),
      });
    const a = await make().fetch();
    const b = await make().fetch();
    const hashOf = (r: typeof a, key: string) =>
      r.artifacts.find((x) => x.artifactKey === key)?.contentHash;
    expect(hashOf(a, "layer-121:ramapo-lake")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOf(a, "layer-121:ramapo-lake")).toBe(
      hashOf(b, "layer-121:ramapo-lake"),
    );
  });

  it("surfaces an ArcGIS error envelope", async () => {
    const failing: HttpClient = async () => ({
      status: 200,
      json: { error: { code: 400, message: "bad query" } },
    });
    const adapter = new NjDepArcGisAdapter({ httpClient: failing });
    await expect(adapter.fetch()).rejects.toThrow(/ArcGIS error 400/);
  });
});
