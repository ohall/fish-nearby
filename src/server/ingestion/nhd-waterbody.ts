import type { SourceArtifact } from "../../contracts/ingestion.ts";

import { hashPayload } from "./hash.ts";
import {
  fetchJson,
  type FetchJsonOptions,
  type HttpClient,
  fetchHttpClient,
} from "./http.ts";
import type { SourceAdapter, SourceFetchResult } from "./types.ts";

export const NJ_NHD_WATERBODY_SOURCE_ID =
  "00000000-0000-4000-8000-000000000002";

const DEFAULT_BASE_URL =
  "https://mapsdep.nj.gov/arcgis/rest/services/Features/Hydrography/MapServer";
const WATERBODY_LAYER_ID = 33;
const PAGE_SIZE = 500;
/** Named lakes/ponds/reservoirs only; streams, estuaries, and canals are out of scope. */
const WHERE_CLAUSE =
  "GNIS_NAME IS NOT NULL AND FTYPE_DESCRIPTION IN ('Lake/Pond','Reservoir')";

type ArcGisPolygonGeometry = {
  rings?: unknown;
  spatialReference?: unknown;
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: ArcGisPolygonGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisFeature[];
  exceededTransferLimit?: boolean;
  error?: { code?: number; message?: string };
};

export type NjDepNhdAdapterOptions = {
  baseUrl?: string;
  httpClient?: HttpClient;
  request?: FetchJsonOptions;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * NJDEP "Waterbody 2015 (NHD)" adapter.
 *
 * Fetches named lake/pond/reservoir polygons from the statewide NHD layer one
 * page at a time. Each polygon feature is emitted as an immutable,
 * content-hashed raw artifact. Grouping split polygons into waters (by
 * GNIS_ID) and deriving centroids happens in generic normalization, not here.
 */
export class NjDepNhdAdapter implements SourceAdapter {
  readonly sourceId = NJ_NHD_WATERBODY_SOURCE_ID;

  private readonly baseUrl: string;
  private readonly http: HttpClient;
  private readonly request: FetchJsonOptions;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: NjDepNhdAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.http = options.httpClient ?? fetchHttpClient;
    this.request = options.request ?? {};
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.now = options.now ?? (() => new Date());
  }

  async fetch(): Promise<SourceFetchResult> {
    const artifacts: SourceArtifact[] = [];
    let offset = 0;
    let completeSnapshot = true;

    for (;;) {
      const page = await this.queryLayer(offset);
      const features = page.features ?? [];

      for (const feature of features) {
        artifacts.push(
          this.toArtifact(`nhd-waterbody:${this.featureId(feature)}`, feature),
        );
      }

      if (features.length < PAGE_SIZE && page.exceededTransferLimit !== true) {
        break;
      }
      offset += features.length;
      if (features.length === 0) {
        completeSnapshot = false;
        break;
      }
    }

    return { artifacts, completeSnapshot };
  }

  private layerUrl(): string {
    return `${this.baseUrl}/${WATERBODY_LAYER_ID}/query`;
  }

  private async queryLayer(offset: number): Promise<ArcGisQueryResponse> {
    const json = await fetchJson(
      this.http,
      {
        url: this.layerUrl(),
        timeoutMs: this.timeoutMs,
        searchParams: {
          where: WHERE_CLAUSE,
          outFields:
            "OBJECTID,COMID,PERMANENT_IDENTIFIER,GNIS_ID,GNIS_NAME,FTYPE_DESCRIPTION,AREASQKM",
          returnGeometry: true,
          outSR: 4326,
          f: "json",
          orderByFields: "OBJECTID",
          resultOffset: offset,
          resultRecordCount: PAGE_SIZE,
        },
      },
      this.request,
    );
    return this.assertOk(json);
  }

  private assertOk(json: unknown): ArcGisQueryResponse {
    const response = json as ArcGisQueryResponse;
    if (response?.error) {
      throw new Error(
        `ArcGIS error ${response.error.code ?? "unknown"}: ${response.error.message ?? "no message"}`,
      );
    }
    if (typeof response !== "object" || response === null) {
      throw new Error("ArcGIS returned a non-object response");
    }
    return response;
  }

  /**
   * Stable per-feature id. OBJECTID is the only unique feature key in this
   * layer: COMID is always null and PERMANENT_IDENTIFIER has duplicates
   * upstream (verified 2026-08-18). The 2015 snapshot is static, so OBJECTID
   * is stable across runs.
   */
  private featureId(feature: ArcGisFeature): string {
    const objectId = feature.attributes?.OBJECTID;
    if (typeof objectId === "number") {
      return String(objectId);
    }
    const permanentId = feature.attributes?.PERMANENT_IDENTIFIER;
    if (typeof permanentId === "string" && permanentId.length > 0) {
      return permanentId;
    }
    throw new Error("ArcGIS feature is missing a stable ID");
  }

  private toArtifact(artifactKey: string, payload: unknown): SourceArtifact {
    return {
      sourceId: this.sourceId,
      artifactKey,
      fetchedAt: this.now().toISOString(),
      contentHash: hashPayload(payload),
      payload: payload as SourceArtifact["payload"],
    };
  }
}
