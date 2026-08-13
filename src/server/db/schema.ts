import {
  boolean,
  char,
  customType,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const geometryPoint = customType<{ data: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

export const waterBodyType = pgEnum("water_body_type", [
  "lake",
  "pond",
  "reservoir",
  "river",
  "stream",
  "unknown",
]);
export const evidenceType = pgEnum("evidence_type", [
  "agency_recommended_presence",
  "agency_listed_presence",
  "stocking",
  "survey",
  "report",
]);
export const extractionMethod = pgEnum("extraction_method", [
  "structured_source",
  "deterministic_document",
  "llm_document",
]);
export const reviewState = pgEnum("review_state", [
  "accepted",
  "review",
  "rejected",
]);
export const confidenceTier = pgEnum("confidence_tier", [
  "high",
  "medium",
  "low",
]);
export const ingestionRunStatus = pgEnum("ingestion_run_status", [
  "fetching",
  "staged",
  "validated",
  "published",
  "failed",
]);
export const snapshotKind = pgEnum("snapshot_kind", ["full", "incremental"]);
export const inferenceValidationStatus = pgEnum("inference_validation_status", [
  "pending",
  "valid",
  "invalid",
]);
export const reviewActorType = pgEnum("review_actor_type", [
  "rule",
  "correction",
  "reviewer",
]);

const auditTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const sources = pgTable("source", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  agency: text("agency").notNull(),
  upstreamUrl: text("upstream_url").notNull(),
  sourceKind: text("source_kind").notNull(),
  jurisdiction: char("jurisdiction", { length: 2 }).notNull(),
  refreshCadence: text("refresh_cadence"),
  attribution: text("attribution"),
  licenseNotes: text("license_notes"),
  enabled: boolean("enabled").notNull().default(true),
  currentRunId: uuid("current_run_id"),
  ...auditTimestamps,
});

export const ingestionRuns = pgTable("ingestion_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull(),
  codeVersion: text("code_version").notNull(),
  snapshotKind: snapshotKind("snapshot_kind").notNull(),
  status: ingestionRunStatus("status").notNull().default("fetching"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lastSuccessfulWatermark: text("last_successful_watermark"),
  fetchedCount: integer("fetched_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  changedCount: integer("changed_count").notNull().default(0),
  unchangedCount: integer("unchanged_count").notNull().default(0),
  acceptedCount: integer("accepted_count").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  failureCode: text("failure_code"),
  failureDetail: text("failure_detail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rawImports = pgTable("raw_import", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull(),
  ingestionRunId: uuid("ingestion_run_id").notNull(),
  artifactKey: text("artifact_key").notNull(),
  contentHash: char("content_hash", { length: 64 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inferences = pgTable(
  "inference",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawImportId: uuid("raw_import_id"),
    task: text("task").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputHash: char("input_hash", { length: 64 }).notNull(),
    output: jsonb("output"),
    validationStatus: inferenceValidationStatus("validation_status")
      .notNull()
      .default("pending"),
    validationErrors: jsonb("validation_errors"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("inference_cache_key").on(
      table.task,
      table.provider,
      table.model,
      table.promptVersion,
      table.inputHash,
    ),
  ],
);

export const waterBodies = pgTable("water_body", {
  id: uuid("id").primaryKey().defaultRandom(),
  normalizedName: text("normalized_name").notNull(),
  displayName: text("display_name").notNull(),
  type: waterBodyType("type").notNull().default("unknown"),
  state: char("state", { length: 2 }).notNull(),
  county: text("county"),
  geom: geometryPoint("geom").notNull(),
  ...auditTimestamps,
});

export const waterBodySources = pgTable("water_body_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  waterBodyId: uuid("water_body_id").notNull(),
  sourceId: uuid("source_id").notNull(),
  externalId: text("external_id").notNull(),
  observedName: text("observed_name").notNull(),
  rawImportId: uuid("raw_import_id").notNull(),
  matchConfidence: confidenceTier("match_confidence").notNull(),
  reviewState: reviewState("review_state").notNull().default("review"),
  firstSeenRunId: uuid("first_seen_run_id").notNull(),
  lastSeenRunId: uuid("last_seen_run_id").notNull(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  ...auditTimestamps,
});

export const species = pgTable("species", {
  id: uuid("id").primaryKey().defaultRandom(),
  commonName: text("common_name").notNull(),
  normalizedCommonName: text("normalized_common_name").notNull(),
  scientificName: text("scientific_name"),
  taxonomyKey: text("taxonomy_key"),
  ...auditTimestamps,
});

export const speciesAliases = pgTable("species_alias", {
  id: uuid("id").primaryKey().defaultRandom(),
  speciesId: uuid("species_id").notNull(),
  sourceId: uuid("source_id"),
  alias: text("alias").notNull(),
  normalizedAlias: text("normalized_alias").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const waterBodySpecies = pgTable("water_body_species", {
  id: uuid("id").primaryKey().defaultRandom(),
  waterBodyId: uuid("water_body_id").notNull(),
  speciesId: uuid("species_id").notNull(),
  sourceId: uuid("source_id").notNull(),
  rawImportId: uuid("raw_import_id").notNull(),
  inferenceId: uuid("inference_id"),
  sourceEvidenceKey: text("source_evidence_key").notNull(),
  evidenceType: evidenceType("evidence_type").notNull(),
  extractionMethod: extractionMethod("extraction_method").notNull(),
  observedOn: date("observed_on"),
  publishedOn: date("published_on"),
  confidenceTier: confidenceTier("confidence_tier").notNull(),
  reviewState: reviewState("review_state").notNull().default("review"),
  firstSeenRunId: uuid("first_seen_run_id").notNull(),
  lastSeenRunId: uuid("last_seen_run_id").notNull(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  ...auditTimestamps,
});

export const reviewDecisions = pgTable("review_decision", {
  id: uuid("id").primaryKey().defaultRandom(),
  waterBodySpeciesId: uuid("water_body_species_id").notNull(),
  previousState: reviewState("previous_state"),
  decidedState: reviewState("decided_state").notNull(),
  reason: text("reason").notNull(),
  actorType: reviewActorType("actor_type").notNull(),
  actorReference: text("actor_reference").notNull(),
  ruleVersion: text("rule_version"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
