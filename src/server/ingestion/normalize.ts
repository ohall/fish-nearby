import type {
  NormalizedEvidence,
  SourceArtifact,
} from "../../contracts/ingestion.ts";
import type {
  confidenceTierSchema,
  reviewStateSchema,
  waterBodyTypeSchema,
} from "../../contracts/waters.ts";
import type { z } from "zod";

export type ConfidenceTier = z.infer<typeof confidenceTierSchema>;
export type ReviewState = z.infer<typeof reviewStateSchema>;
export type WaterBodyType = z.infer<typeof waterBodyTypeSchema>;

/** Species lookup supplied by the caller: normalized alias/common name -> canonical species id. */
export type SpeciesIndex = {
  byNormalizedName: Map<string, string>;
};

/** Water body draft; `rawImportId` is resolved by the caller from persisted raw_import rows. */
export type NormalizedWaterBodyDraft = {
  sourceId: string;
  externalId: string;
  normalizedName: string;
  displayName: string;
  type: WaterBodyType;
  state: string;
  county?: string;
  latitude: number;
  longitude: number;
  confidenceTier: ConfidenceTier;
  reviewState: ReviewState;
};

/** Evidence draft; `rawImportId`/`waterBodyId` are resolved at publish time. */
export type NormalizedEvidenceDraft = {
  sourceId: string;
  sourceEvidenceKey: string;
  /** stable external id of the parent water point, resolved to a water body at publish time */
  waterExternalId: string;
  /** artifact key of the game-fish raw import that backs this evidence row */
  rawArtifactKey: string;
  speciesId: string;
  evidenceType: NormalizedEvidence["evidenceType"];
  extractionMethod: NormalizedEvidence["extractionMethod"];
  observedOn?: string;
  publishedOn?: string;
  confidenceTier: ConfidenceTier;
  reviewState: ReviewState;
};

export type NormalizeResult = {
  waterBodies: NormalizedWaterBodyDraft[];
  evidence: NormalizedEvidenceDraft[];
  /** artifact keys that could not be deterministically normalized. */
  quarantined: string[];
};

type WaterAttributes = {
  WATERBODY?: unknown;
  GNIS_NAME?: unknown;
  ID?: unknown;
  OBJECTID?: unknown;
  LATDD?: unknown;
  LONDD?: unknown;
  COUNTY?: unknown;
  ACRES?: unknown;
};

type GameFishAttributes = {
  COMMON_NAME?: unknown;
  SPECIES?: unknown;
  FISH?: unknown;
  GAME_FISH?: unknown;
};

/** Parse a water artifact key `layer-121:<externalId>`. */
function parseWaterKey(key: string): string | undefined {
  const match = /^layer-121:(.+)$/.exec(key);
  return match ? match[1] : undefined;
}

/** Parse a game-fish artifact key `layer-122:<externalId>:<row>`. */
function parseGameFishKey(key: string): string | undefined {
  const match = /^layer-122:(.+):\d+$/.exec(key);
  return match ? match[1] : undefined;
}

/** Normalize a name for matching: lowercase, strip punctuation, collapse spaces. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function inferType(name: string): WaterBodyType {
  const n = name.toLowerCase();
  if (/\breservoir\b/.test(n)) return "reservoir";
  if (/\bpond\b/.test(n)) return "pond";
  if (/\blake\b/.test(n)) return "lake";
  if (/\briver\b/.test(n)) return "river";
  if (/\b(stream|brook|creek|branch|kill)\b/.test(n)) return "stream";
  return "unknown";
}

function deriveConfidence(
  name: string,
  latitude: number,
  longitude: number,
): { confidenceTier: ConfidenceTier; reviewState: ReviewState } {
  const inRange =
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  if (name.length > 0 && inRange) {
    return { confidenceTier: "high", reviewState: "accepted" };
  }
  return { confidenceTier: "low", reviewState: "review" };
}

/**
 * Deterministically normalize raw NJDEP artifacts into water bodies and species
 * evidence. No OpenRouter calls happen on this structured-source path.
 *
 * Artifacts are paired by stable external id: `layer-121:<id>` (water point) and
 * `layer-122:<id>` (game-fish row). Raw-import ids are resolved by the caller
 * from persisted raw_import rows.
 */
export function normalizeNjDepArtifacts(
  artifacts: SourceArtifact[],
  speciesIndex: SpeciesIndex,
): NormalizeResult {
  const waters = new Map<string, SourceArtifact>();
  const gameFish = new Map<string, SourceArtifact[]>();

  for (const artifact of artifacts) {
    const waterExternalId = parseWaterKey(artifact.artifactKey);
    if (waterExternalId !== undefined) {
      waters.set(waterExternalId, artifact);
      continue;
    }
    const fishExternalId = parseGameFishKey(artifact.artifactKey);
    if (fishExternalId !== undefined) {
      const list = gameFish.get(fishExternalId) ?? [];
      list.push(artifact);
      gameFish.set(fishExternalId, list);
    }
  }

  const waterBodies: NormalizedWaterBodyDraft[] = [];
  const evidence: NormalizedEvidenceDraft[] = [];
  const quarantined: string[] = [];

  for (const [externalId, waterArtifact] of waters) {
    const payload = waterArtifact.payload as {
      attributes?: WaterAttributes;
      geometry?: { x?: unknown; y?: unknown };
    };
    const attributes = payload.attributes ?? {};
    const displayName =
      asNonEmptyString(attributes.WATERBODY) ??
      asNonEmptyString(attributes.GNIS_NAME);
    const longitude =
      asFiniteNumber(payload.geometry?.x) ?? asFiniteNumber(attributes.LONDD);
    const latitude =
      asFiniteNumber(payload.geometry?.y) ?? asFiniteNumber(attributes.LATDD);

    if (!displayName || latitude === undefined || longitude === undefined) {
      quarantined.push(waterArtifact.artifactKey);
      continue;
    }

    const normalizedName = normalizeName(displayName);
    const type = inferType(displayName);
    const county = asNonEmptyString(attributes.COUNTY);
    const { confidenceTier, reviewState } = deriveConfidence(
      displayName,
      latitude,
      longitude,
    );

    waterBodies.push({
      sourceId: waterArtifact.sourceId,
      externalId,
      normalizedName,
      displayName,
      type,
      state: "NJ",
      ...(county ? { county } : {}),
      latitude,
      longitude,
      confidenceTier,
      reviewState,
    });

    for (const fishArtifact of gameFish.get(externalId) ?? []) {
      const fishAttributes =
        (fishArtifact.payload as { attributes?: GameFishAttributes })
          .attributes ?? {};
      const speciesText =
        asNonEmptyString(fishAttributes.COMMON_NAME) ??
        asNonEmptyString(fishAttributes.SPECIES) ??
        asNonEmptyString(fishAttributes.FISH) ??
        asNonEmptyString(fishAttributes.GAME_FISH);

      if (!speciesText) {
        quarantined.push(fishArtifact.artifactKey);
        continue;
      }

      const speciesId = speciesIndex.byNormalizedName.get(
        normalizeName(speciesText),
      );
      if (!speciesId) {
        quarantined.push(fishArtifact.artifactKey);
        continue;
      }

      evidence.push({
        sourceId: waterArtifact.sourceId,
        sourceEvidenceKey: `layer-122:${externalId}:${normalizeName(speciesText).replace(/\s+/g, "-")}`,
        waterExternalId: externalId,
        rawArtifactKey: fishArtifact.artifactKey,
        speciesId,
        evidenceType: "agency_listed_presence",
        extractionMethod: "structured_source",
        confidenceTier,
        reviewState,
      });
    }
  }

  return { waterBodies, evidence, quarantined };
}
