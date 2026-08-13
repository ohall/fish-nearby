import { z } from "zod";

import {
  confidenceTierSchema,
  evidenceTypeSchema,
  extractionMethodSchema,
  reviewStateSchema,
  waterBodyTypeSchema,
} from "./waters";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const sourceArtifactSchema = z.object({
  sourceId: z.uuid(),
  artifactKey: z.string().min(1),
  fetchedAt: z.iso.datetime({ offset: true }),
  contentHash: sha256Schema,
  payload: z.json(),
});

export const sourceFetchPageSchema = z.object({
  artifacts: z.array(sourceArtifactSchema),
  nextCursor: z.string().min(1).optional(),
  completeSnapshot: z.boolean(),
});

export const normalizedWaterBodySchema = z.object({
  sourceId: z.uuid(),
  externalId: z.string().min(1),
  rawImportId: z.uuid(),
  normalizedName: z.string().min(1),
  displayName: z.string().min(1),
  type: waterBodyTypeSchema,
  state: z.string().regex(/^[A-Z]{2}$/),
  county: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  confidenceTier: confidenceTierSchema,
  reviewState: reviewStateSchema,
});

export const normalizedEvidenceSchema = z.object({
  sourceId: z.uuid(),
  sourceEvidenceKey: z.string().min(1),
  rawImportId: z.uuid(),
  waterBodyId: z.uuid(),
  speciesId: z.uuid(),
  inferenceId: z.uuid().optional(),
  evidenceType: evidenceTypeSchema,
  extractionMethod: extractionMethodSchema,
  observedOn: z.iso.date().optional(),
  publishedOn: z.iso.date().optional(),
  confidenceTier: confidenceTierSchema,
  reviewState: reviewStateSchema,
});

export type SourceArtifact = z.infer<typeof sourceArtifactSchema>;
export type SourceFetchPage = z.infer<typeof sourceFetchPageSchema>;
export type NormalizedWaterBody = z.infer<typeof normalizedWaterBodySchema>;
export type NormalizedEvidence = z.infer<typeof normalizedEvidenceSchema>;
