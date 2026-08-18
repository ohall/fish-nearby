import type { SourceArtifact } from "../../contracts/ingestion.ts";

import type { PgQueryClient } from "../db/pg.ts";
import type {
  NormalizedEvidenceDraft,
  NormalizedWaterBodyDraft,
} from "./normalize.ts";

export type RunCounts = {
  fetchedCount: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  acceptedCount: number;
  reviewCount: number;
  rejectedCount: number;
  errorCount: number;
};

type Sql = PgQueryClient;

/** Create a new ingestion run in `fetching` status and return its id. */
export async function createRun(
  sql: Sql,
  sourceId: string,
  snapshotKind: "full" | "incremental",
  codeVersion: string,
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into public.ingestion_run (source_id, code_version, snapshot_kind, status)
    values (${sourceId}, ${codeVersion}, ${snapshotKind}, 'fetching')
    returning id
  `;
  const row = rows[0];
  if (!row) throw new Error("failed to create ingestion run");
  return row.id;
}

/** Mark a run failed with a code and safe detail. */
export async function failRun(
  sql: Sql,
  runId: string,
  sourceId: string,
  failureCode: string,
  failureDetail: string,
): Promise<void> {
  await sql`
    update public.ingestion_run
    set status = 'failed',
        finished_at = now(),
        failure_code = ${failureCode},
        failure_detail = ${failureDetail}
    where id = ${runId} and source_id = ${sourceId}
  `;
}

/**
 * Raw-first persistence: insert every fetched artifact, keyed by
 * (source, artifact_key, content_hash). Returns artifact_key -> raw_import id
 * for all artifacts of this source, plus new/changed/unchanged counts derived
 * from content hashes. Unchanged artifacts are not re-processed downstream.
 */
export async function storeRawArtifacts(
  sql: Sql,
  runId: string,
  artifacts: SourceArtifact[],
): Promise<{
  idByKey: Map<string, string>;
  changedKeys: Set<string>;
  counts: Pick<RunCounts, "newCount" | "changedCount" | "unchangedCount">;
}> {
  const idByKey = new Map<string, string>();
  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  const changedKeys = new Set<string>();

  for (const artifact of artifacts) {
    const rows = await sql<{ id: string }[]>`
      insert into public.raw_import (
        source_id, ingestion_run_id, artifact_key, content_hash, fetched_at, payload
      )
      values (
        ${artifact.sourceId},
        ${runId},
        ${artifact.artifactKey},
        ${artifact.contentHash},
        ${artifact.fetchedAt},
        ${sql.json(artifact.payload as never)}
      )
      on conflict (source_id, artifact_key, content_hash) do nothing
      returning id
    `;

    const existing = rows[0];
    if (existing) {
      idByKey.set(artifact.artifactKey, existing.id);
    } else {
      const found = await sql<{ id: string }[]>`
        select id from public.raw_import
        where source_id = ${artifact.sourceId}
          and artifact_key = ${artifact.artifactKey}
          and content_hash = ${artifact.contentHash}
      `;
      const row = found[0];
      if (!row) {
        throw new Error(
          `failed to persist raw artifact ${artifact.artifactKey}`,
        );
      }
      idByKey.set(artifact.artifactKey, row.id);
    }

    // Determine new vs changed vs unchanged relative to prior content for this key.
    const prior = await sql<{ content_hash: string }[]>`
      select content_hash from public.raw_import
      where source_id = ${artifact.sourceId}
        and artifact_key = ${artifact.artifactKey}
        and ingestion_run_id <> ${runId}
      order by fetched_at desc
      limit 1
    `;
    const priorHash = prior[0]?.content_hash;
    if (priorHash === undefined) {
      newCount += 1;
      changedKeys.add(artifact.artifactKey);
    } else if (priorHash === artifact.contentHash) {
      unchangedCount += 1;
    } else {
      changedCount += 1;
      changedKeys.add(artifact.artifactKey);
    }
  }

  return {
    idByKey,
    changedKeys,
    counts: { newCount, changedCount, unchangedCount },
  };
}

/**
 * Transactionally publish normalized rows: upsert water bodies and their source
 * mappings, upsert evidence, and (for a full snapshot) retire source-scoped rows
 * absent from this snapshot. Finally mark the run published and advance the
 * source's current run pointer. Runs in a single transaction so readers keep the
 * prior committed projection until commit.
 */
export async function publishRun(
  sql: Sql,
  runId: string,
  sourceId: string,
  waterBodies: NormalizedWaterBodyDraft[],
  evidence: NormalizedEvidenceDraft[],
  rawIdByKey: Map<string, string>,
  completeSnapshot: boolean,
  counts: RunCounts,
): Promise<void> {
  await sql.begin(async (tx) => {
    const waterIdByExternal = new Map<string, string>();

    for (const water of waterBodies) {
      const rawImportId = rawIdByKey.get(`layer-121:${water.externalId}`);
      if (!rawImportId) {
        throw new Error(`missing raw import for water ${water.externalId}`);
      }

      const wbRows = await tx<{ id: string }[]>`
        insert into public.water_body (
          normalized_name, display_name, type, state, county, geom
        )
        values (
          ${water.normalizedName},
          ${water.displayName},
          ${water.type},
          ${water.state},
          ${water.county ?? null},
          public.fish_nearby_geometry_point(${water.longitude}, ${water.latitude})
        )
        on conflict (state, normalized_name) do update set
          display_name = excluded.display_name,
          type = excluded.type,
          county = excluded.county,
          geom = excluded.geom,
          updated_at = now()
        returning id
      `;
      const waterBodyId = wbRows[0]?.id;
      if (!waterBodyId) throw new Error("failed to upsert water body");
      waterIdByExternal.set(water.externalId, waterBodyId);

      await tx`
        insert into public.water_body_source (
          water_body_id, source_id, external_id, observed_name, raw_import_id,
          match_confidence, review_state, first_seen_run_id, last_seen_run_id
        )
        values (
          ${waterBodyId},
          ${sourceId},
          ${water.externalId},
          ${water.displayName},
          ${rawImportId},
          ${water.confidenceTier},
          ${water.reviewState},
          ${runId},
          ${runId}
        )
        on conflict (source_id, external_id) do update set
          observed_name = excluded.observed_name,
          raw_import_id = excluded.raw_import_id,
          match_confidence = excluded.match_confidence,
          review_state = excluded.review_state,
          last_seen_run_id = excluded.last_seen_run_id,
          retired_at = null,
          updated_at = now()
      `;
    }

    for (const item of evidence) {
      const waterBodyId = waterIdByExternal.get(item.waterExternalId);
      const rawImportId = rawIdByKey.get(item.rawArtifactKey);
      if (!waterBodyId) {
        throw new Error(
          `missing water body for evidence ${item.sourceEvidenceKey}`,
        );
      }
      if (!rawImportId) {
        throw new Error(
          `missing raw import for evidence ${item.sourceEvidenceKey}`,
        );
      }

      await tx`
        insert into public.water_body_species (
          water_body_id, species_id, source_id, raw_import_id, source_evidence_key,
          evidence_type, extraction_method, observed_on, published_on,
          confidence_tier, review_state, first_seen_run_id, last_seen_run_id
        )
        values (
          ${waterBodyId},
          ${item.speciesId},
          ${sourceId},
          ${rawImportId},
          ${item.sourceEvidenceKey},
          ${item.evidenceType},
          ${item.extractionMethod},
          ${item.observedOn ?? null},
          ${item.publishedOn ?? null},
          ${item.confidenceTier},
          ${item.reviewState},
          ${runId},
          ${runId}
        )
        on conflict (source_id, source_evidence_key) do update set
          raw_import_id = excluded.raw_import_id,
          confidence_tier = excluded.confidence_tier,
          review_state = excluded.review_state,
          last_seen_run_id = excluded.last_seen_run_id,
          retired_at = null,
          updated_at = now()
      `;
    }

    if (completeSnapshot) {
      const externalIds = waterBodies.map((w) => w.externalId);
      const evidenceKeys = evidence.map((e) => e.sourceEvidenceKey);

      await tx`
        update public.water_body_source
        set retired_at = now(), updated_at = now()
        where source_id = ${sourceId}
          and retired_at is null
          and external_id <> all (${tx.array(externalIds)})
      `;
      await tx`
        update public.water_body_species
        set retired_at = now(), updated_at = now()
        where source_id = ${sourceId}
          and retired_at is null
          and source_evidence_key <> all (${tx.array(evidenceKeys)})
      `;
    }

    await tx`
      update public.ingestion_run
      set status = 'published',
          finished_at = now(),
          fetched_count = ${counts.fetchedCount},
          new_count = ${counts.newCount},
          changed_count = ${counts.changedCount},
          unchanged_count = ${counts.unchangedCount},
          accepted_count = ${counts.acceptedCount},
          review_count = ${counts.reviewCount},
          rejected_count = ${counts.rejectedCount},
          error_count = ${counts.errorCount}
      where id = ${runId} and source_id = ${sourceId}
    `;

    await tx`
      update public.source
      set current_run_id = ${runId}, updated_at = now()
      where id = ${sourceId}
    `;
  });
}

/** Load the species alias index used for deterministic species mapping. */
export async function loadSpeciesIndex(
  sql: Sql,
): Promise<{ byNormalizedName: Map<string, string> }> {
  const byNormalizedName = new Map<string, string>();

  const canonical = await sql<{ id: string; normalized_common_name: string }[]>`
    select id, normalized_common_name from public.species
  `;
  for (const row of canonical) {
    byNormalizedName.set(row.normalized_common_name, row.id);
  }

  const aliases = await sql<{ species_id: string; normalized_alias: string }[]>`
    select species_id, normalized_alias from public.species_alias
  `;
  for (const row of aliases) {
    byNormalizedName.set(row.normalized_alias, row.species_id);
  }

  return { byNormalizedName };
}
