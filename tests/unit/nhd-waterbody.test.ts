import { describe, expect, it } from "vitest";

import type { HttpClient } from "@/server/ingestion/http";
import { NjDepNhdAdapter } from "@/server/ingestion/nhd-waterbody";
import { nhdWaterbodyPage } from "../fixtures/nhd-waterbody";

function makeClient(): HttpClient {
  return async ({ url }) => {
    if (url.endsWith("/33/query")) {
      return { status: 200, json: nhdWaterbodyPage };
    }
    return { status: 200, json: { features: [] } };
  };
}

describe("NjDepNhdAdapter", () => {
  it("emits one raw artifact per polygon feature", async () => {
    const adapter = new NjDepNhdAdapter({
      httpClient: makeClient(),
      now: () => new Date("2026-08-18T00:00:00Z"),
    });
    const result = await adapter.fetch();

    expect(result.artifacts).toHaveLength(5);
    expect(result.completeSnapshot).toBe(true);

    const keys = result.artifacts.map((a) => a.artifactKey).sort();
    expect(keys).toEqual([
      "nhd-waterbody:11",
      "nhd-waterbody:12",
      "nhd-waterbody:13",
      "nhd-waterbody:14",
      "nhd-waterbody:15",
    ]);
  });

  it("queries only named lake/pond/reservoir features", async () => {
    let seenWhere = "";
    const recording: HttpClient = async ({ searchParams }) => {
      seenWhere = String(searchParams?.where ?? "");
      return { status: 200, json: { features: [] } };
    };
    const adapter = new NjDepNhdAdapter({ httpClient: recording });
    await adapter.fetch();
    expect(seenWhere).toContain("GNIS_NAME IS NOT NULL");
    expect(seenWhere).toContain("Lake/Pond");
    expect(seenWhere).toContain("Reservoir");
  });

  it("uses a deterministic content hash and stable artifact keys", async () => {
    const make = () =>
      new NjDepNhdAdapter({
        httpClient: makeClient(),
        now: () => new Date("2026-08-18T00:00:00Z"),
      });
    const a = await make().fetch();
    const b = await make().fetch();
    const hashOf = (r: typeof a, key: string) =>
      r.artifacts.find((x) => x.artifactKey === key)?.contentHash;
    const key = "nhd-waterbody:11";
    expect(hashOf(a, key)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOf(a, key)).toBe(hashOf(b, key));
  });

  it("paginates until a short page", async () => {
    const full = {
      features: nhdWaterbodyPage.features,
      exceededTransferLimit: true,
    };
    const offsets: number[] = [];
    const paged: HttpClient = async ({ searchParams }) => {
      const offset = Number(searchParams?.resultOffset ?? 0);
      offsets.push(offset);
      if (offset === 0) return { status: 200, json: full };
      return { status: 200, json: { features: [] } };
    };
    const adapter = new NjDepNhdAdapter({ httpClient: paged });
    const result = await adapter.fetch();
    expect(offsets).toEqual([0, 5]);
    // Empty trailing page without exceededTransferLimit = end of data.
    expect(result.completeSnapshot).toBe(true);
    expect(result.artifacts).toHaveLength(5);
  });

  it("surfaces an ArcGIS error envelope", async () => {
    const failing: HttpClient = async () => ({
      status: 200,
      json: { error: { code: 400, message: "bad query" } },
    });
    const adapter = new NjDepNhdAdapter({ httpClient: failing });
    await expect(adapter.fetch()).rejects.toThrow(/ArcGIS error 400/);
  });
});
