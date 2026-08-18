import type { SourceArtifact } from "../../contracts/ingestion.ts";

import { hashPayload } from "./hash.ts";
import {
  fetchJson,
  type FetchJsonOptions,
  type HttpClient,
  fetchHttpClient,
} from "./http.ts";
import type { SourceAdapter, SourceFetchResult } from "./types.ts";

export const NJ_GFCH_SOURCE_ID = "00000000-0000-4000-8000-000000000001";

const DEFAULT_BASE_URL =
  "https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental/MapServer";
const POINT_LAYER_ID = 121;
/** "Game Fish" relationship from layer 121 to table 122, keyed on the ID field. */
const RELATIONSHIP_ID = 4;
const PAGE_SIZE = 100;

type ArcGisGeometry = { x?: unknown; y?: unknown; spatialReference?: unknown };

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: ArcGisGeometry;
};

type ArcGisQueryResponse = {
  features?: ArcGisFeature[];
  exceededTransferLimit?: boolean;
  error?: { code?: number; message?: string };
};

export type NjDepArcGisAdapterOptions = {
  baseUrl?: string;
  httpClient?: HttpClient;
  request?: FetchJsonOptions;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * NJDEP "Great Fishing Close to Home" adapter.
 *
 * Fetches the point layer (121) one page at a time, and for each page of waters
 * fetches the related Game Fish rows (table 122) via the layer relationship.
 * Each water point and each related game-fish row is emitted as an immutable,
 * content-hashed raw artifact. No species/water normalization happens here.
 */
export class NjDepArcGisAdapter implements SourceAdapter {
  readonly sourceId = NJ_GFCH_SOURCE_ID;

  private readonly baseUrl: string;
  private readonly http: HttpClient;
  private readonly request: FetchJsonOptions;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: NjDepArcGisAdapterOptions = {}) {
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
      const page = await this.queryLayer(POINT_LAYER_ID, offset);
      const features = page.features ?? [];

      for (const feature of features) {
        const externalId = this.externalId(feature);
        const objectId = feature.attributes?.OBJECTID;
        const related = await this.queryRelatedGameFish(objectId);
        related.forEach((fish, index) => {
          artifacts.push(
            this.toArtifact(`layer-122:${externalId}:${index}`, fish),
          );
        });
        artifacts.push(this.toArtifact(`layer-121:${externalId}`, feature));
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

  private layerUrl(layerId: number): string {
    return `${this.baseUrl}/${layerId}/query`;
  }

  private async queryLayer(
    layerId: number,
    offset: number,
  ): Promise<ArcGisQueryResponse> {
    const json = await fetchJson(
      this.http,
      {
        url: this.layerUrl(layerId),
        timeoutMs: this.timeoutMs,
        searchParams: {
          where: "1=1",
          outFields: "*",
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

  private async queryRelatedGameFish(
    objectId: unknown,
  ): Promise<ArcGisFeature[]> {
    if (typeof objectId !== "number") {
      return [];
    }
    const json = await fetchJson(
      this.http,
      {
        url: `${this.baseUrl}/${POINT_LAYER_ID}/queryRelatedRecords`,
        timeoutMs: this.timeoutMs,
        searchParams: {
          objectIds: objectId,
          relationshipId: RELATIONSHIP_ID,
          outFields: "*",
          returnGeometry: false,
          f: "json",
        },
      },
      this.request,
    );
    const response = this.assertOk(json) as {
      relatedRecordGroups?: Array<{ relatedRecords?: ArcGisFeature[] }>;
    };
    const group = response.relatedRecordGroups?.[0];
    return group?.relatedRecords ?? [];
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

  private externalId(feature: ArcGisFeature): string {
    const id = feature.attributes?.ID;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    if (typeof id === "number") {
      return String(id);
    }
    const objectId = feature.attributes?.OBJECTID;
    if (typeof objectId === "number") {
      return `objectid-${objectId}`;
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
