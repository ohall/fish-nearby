import { z } from "zod";

export const waterBodyTypeSchema = z.enum([
  "lake",
  "pond",
  "reservoir",
  "river",
  "stream",
  "unknown",
]);

export const evidenceTypeSchema = z.enum([
  "agency_recommended_presence",
  "agency_listed_presence",
  "stocking",
  "survey",
  "report",
]);

export const extractionMethodSchema = z.enum([
  "structured_source",
  "deterministic_document",
  "llm_document",
]);

export const reviewStateSchema = z.enum(["accepted", "review", "rejected"]);
export const confidenceTierSchema = z.enum(["high", "medium", "low"]);

export const nearbyWaterSearchRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(1_000).max(100_000).default(25_000),
});

export const representativePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const nearbyWaterSummarySchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(1),
  type: waterBodyTypeSchema,
  representativePoint: representativePointSchema,
  distanceMeters: z.number().nonnegative(),
  acceptedSpeciesCount: z.number().int().nonnegative(),
});

export const nearbyWaterSearchResponseSchema = z.object({
  waters: z.array(nearbyWaterSummarySchema).max(200),
});

export const evidenceItemSchema = z.object({
  id: z.uuid(),
  evidenceType: evidenceTypeSchema,
  sourceLabel: z.string().min(1),
  sourceUrl: z.url().optional(),
  observedOn: z.iso.date().optional(),
  publishedOn: z.iso.date().optional(),
  confidenceTier: confidenceTierSchema,
});

export const speciesEvidenceSchema = z.object({
  id: z.uuid(),
  commonName: z.string().min(1),
  scientificName: z.string().min(1).optional(),
  evidence: z.array(evidenceItemSchema).min(1),
});

export const waterDetailResponseSchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(1),
  type: waterBodyTypeSchema,
  state: z.string().regex(/^[A-Z]{2}$/),
  county: z.string().min(1).optional(),
  representativePoint: representativePointSchema,
  species: z.array(speciesEvidenceSchema),
});

export const mapWaterSchema = waterDetailResponseSchema.extend({
  distanceMeters: z.number().nonnegative(),
});

export const mapWaterListResponseSchema = z.object({
  waters: z.array(mapWaterSchema).max(200),
});

export type NearbyWaterSearchRequest = z.infer<
  typeof nearbyWaterSearchRequestSchema
>;
export type NearbyWaterSearchResponse = z.infer<
  typeof nearbyWaterSearchResponseSchema
>;
export type WaterDetailResponse = z.infer<typeof waterDetailResponseSchema>;
export type MapWater = z.infer<typeof mapWaterSchema>;
export type MapWaterListResponse = z.infer<typeof mapWaterListResponseSchema>;
