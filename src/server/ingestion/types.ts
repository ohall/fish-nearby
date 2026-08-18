import type { SourceArtifact } from "../../contracts/ingestion.ts";

/**
 * A single page of raw artifacts fetched from an upstream source.
 *
 * `completeSnapshot` indicates the adapter fetched the entire source snapshot
 * (a "full" run). Only a complete snapshot may retire previously published rows
 * that are absent from the snapshot; a partial or failed fetch must never
 * imply deletion.
 */
export type SourceFetchResult = {
  artifacts: SourceArtifact[];
  completeSnapshot: boolean;
};

/**
 * Minimal source-adapter contract.
 *
 * Adapters are responsible only for fetching raw source records and returning
 * them as content-hashed artifacts. Normalization, matching, validation, and
 * persistence live in generic ingestion code, never inside an adapter.
 *
 * Implementations handle their own pagination, timeouts, and bounded
 * retry/backoff internally and surface aggregate statistics after `fetch`.
 */
export interface SourceAdapter {
  readonly sourceId: string;
  fetch(): Promise<SourceFetchResult>;
}
