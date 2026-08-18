import type { PgQueryClient } from "../db/pg.ts";
import { normalizeArtifacts } from "./normalize.ts";
import {
  createRun,
  failRun,
  loadSpeciesIndex,
  publishRun,
  storeRawArtifacts,
  type RunCounts,
} from "./store.ts";
import type { SourceAdapter } from "./types.ts";

export type IngestSummary = {
  runId: string;
  status: "published" | "failed";
  completeSnapshot: boolean;
  counts: RunCounts;
  quarantined: number;
};

export type IngestOptions = {
  codeVersion?: string;
};

/**
 * Run the full ingestion pipeline for one source: fetch -> persist raw first ->
 * normalize deterministically -> transactionally publish. A failed or partial
 * run is marked failed and never advances the source's published pointer.
 */
export async function runIngestion(
  sql: PgQueryClient,
  adapter: SourceAdapter,
  options: IngestOptions = {},
): Promise<IngestSummary> {
  const codeVersion =
    options.codeVersion ?? process.env.npm_package_version ?? "0.0.0";
  const runId = await createRun(sql, adapter.sourceId, "full", codeVersion);

  try {
    const { artifacts, completeSnapshot } = await adapter.fetch();

    // Raw-first: persist every fetched artifact before deriving canonical facts.
    const stored = await storeRawArtifacts(sql, runId, artifacts);

    const speciesIndex = await loadSpeciesIndex(sql);
    const { waterBodies, evidence, quarantined } = normalizeArtifacts(
      artifacts,
      speciesIndex,
    );

    const counts: RunCounts = {
      fetchedCount: artifacts.length,
      ...stored.counts,
      acceptedCount:
        waterBodies.filter((w) => w.reviewState === "accepted").length +
        evidence.filter((e) => e.reviewState === "accepted").length,
      reviewCount:
        waterBodies.filter((w) => w.reviewState === "review").length +
        evidence.filter((e) => e.reviewState === "review").length +
        quarantined.length,
      rejectedCount: 0,
      errorCount: 0,
    };

    await publishRun(
      sql,
      runId,
      adapter.sourceId,
      waterBodies,
      evidence,
      stored.idByKey,
      completeSnapshot,
      counts,
    );

    return {
      runId,
      status: "published",
      completeSnapshot,
      counts,
      quarantined: quarantined.length,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await failRun(
      sql,
      runId,
      adapter.sourceId,
      "ingest_failed",
      detail.slice(0, 500),
    ).catch(() => undefined);
    // Surface the failure to the caller/CI rather than swallowing it.
    throw error instanceof Error ? error : new Error(detail);
  }
}
