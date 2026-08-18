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
  /** artifact key of the raw import that backs this water body row */
  rawArtifactKey: string;
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

/** Parse an NHD waterbody artifact key `nhd-waterbody:<featureId>`. */
function parseNhdKey(key: string): string | undefined {
  const match = /^nhd-waterbody:(.+)$/.exec(key);
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
      rawArtifactKey: waterArtifact.artifactKey,
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

type NhdAttributes = {
  GNIS_ID?: unknown;
  GNIS_NAME?: unknown;
  WATERBODY_NAME?: unknown;
  FEATURE_NAME?: unknown;
  FTYPE_DESCRIPTION?: unknown;
};

type Ring = [number, number][];

/** Largest-|area| ring of an ESRI polygon, i.e. the main exterior ring. */
function mainRing(rings: unknown): Ring | undefined {
  if (!Array.isArray(rings)) return undefined;
  let best: Ring | undefined;
  let bestArea = 0;
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue;
    const points: Ring = [];
    for (const point of ring) {
      if (
        Array.isArray(point) &&
        typeof point[0] === "number" &&
        typeof point[1] === "number" &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
      ) {
        points.push([point[0], point[1]]);
      }
    }
    if (points.length < 3) continue;
    const area = Math.abs(ringArea(points));
    if (area > bestArea) {
      bestArea = area;
      best = points;
    }
  }
  return best;
}

/** Signed shoelace area of a ring in degree². Sign/scale are irrelevant here. */
function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i]![0]! * ring[i + 1]![1]! - ring[i + 1]![0]! * ring[i]![1]!;
  }
  return sum / 2;
}

/** Area-weighted centroid of a ring; falls back to the vertex average. */
function ringCentroid(ring: Ring): { latitude: number; longitude: number } {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[i + 1]!;
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (twiceArea !== 0) {
    const factor = 3 * twiceArea;
    return { longitude: cx / factor, latitude: cy / factor };
  }
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return { longitude: sx / ring.length, latitude: sy / ring.length };
}

/**
 * Normalize NHD waterbody polygons into water bodies.
 *
 * NHD splits one physical water into many polygons (e.g. Lake Hopatcong x13),
 * so features are grouped by GNIS_ID into one water body each; features with a
 * GNIS_NAME but no GNIS_ID fall back to their per-feature id. Distinct waters
 * that share a name (e.g. the four NJ "Mud Pond"s) keep clean display names
 * but get deterministic `name ~gnis-id` normalized names so they do not
 * collapse under the (state, normalized_name) uniqueness constraint. This
 * source carries no species data, so it yields no evidence.
 */
export function normalizeNhdArtifacts(
  artifacts: SourceArtifact[],
): NormalizeResult {
  type Group = {
    identity: string;
    artifacts: SourceArtifact[];
    area: number;
  };
  const groups = new Map<string, Group>();
  const quarantined: string[] = [];

  for (const artifact of artifacts) {
    const featureId = parseNhdKey(artifact.artifactKey);
    if (featureId === undefined) continue;

    const payload = artifact.payload as {
      attributes?: NhdAttributes;
      geometry?: { rings?: unknown };
    };
    const attributes = payload.attributes ?? {};
    const displayName =
      asNonEmptyString(attributes.GNIS_NAME) ??
      asNonEmptyString(attributes.WATERBODY_NAME) ??
      asNonEmptyString(attributes.FEATURE_NAME);
    const ring = mainRing(payload.geometry?.rings);

    if (!displayName || !ring) {
      quarantined.push(artifact.artifactKey);
      continue;
    }

    const identity = asNonEmptyString(attributes.GNIS_ID) ?? featureId;
    const group = groups.get(identity) ?? { identity, artifacts: [], area: 0 };
    group.artifacts.push(artifact);
    group.area += Math.abs(ringArea(ring));
    groups.set(identity, group);
  }

  // Deterministic order: largest total area wins the bare normalized name.
  const drafts = [...groups.values()].map((group) => {
    const best = group.artifacts
      .map((artifact) => ({
        artifact,
        ring: mainRing(
          (artifact.payload as { geometry?: { rings?: unknown } }).geometry
            ?.rings,
        )!,
      }))
      .sort(
        (a, b) => Math.abs(ringArea(b.ring)) - Math.abs(ringArea(a.ring)),
      )[0]!;
    const attributes =
      (best.artifact.payload as { attributes?: NhdAttributes }).attributes ??
      {};
    const displayName = asNonEmptyString(attributes.GNIS_NAME)!;
    const ftype = asNonEmptyString(attributes.FTYPE_DESCRIPTION);
    const inferred = inferType(displayName);
    const type: WaterBodyType =
      ftype === "Reservoir"
        ? "reservoir"
        : inferred !== "unknown"
          ? inferred
          : "lake";
    const { longitude, latitude } = ringCentroid(best.ring);
    const { confidenceTier, reviewState } = deriveConfidence(
      displayName,
      latitude,
      longitude,
    );

    return {
      identity: group.identity,
      area: group.area,
      draft: {
        sourceId: best.artifact.sourceId,
        externalId: group.identity,
        rawArtifactKey: best.artifact.artifactKey,
        normalizedName: normalizeName(displayName),
        displayName,
        type,
        state: "NJ",
        latitude,
        longitude,
        confidenceTier,
        reviewState,
      } satisfies NormalizedWaterBodyDraft,
    };
  });

  const byName = new Map<string, typeof drafts>();
  for (const entry of drafts) {
    const list = byName.get(entry.draft.normalizedName) ?? [];
    list.push(entry);
    byName.set(entry.draft.normalizedName, list);
  }
  for (const list of byName.values()) {
    list.sort(
      (a, b) => b.area - a.area || a.identity.localeCompare(b.identity),
    );
    for (const [index, entry] of list.entries()) {
      if (index > 0) {
        entry.draft.normalizedName = `${entry.draft.normalizedName} ~${entry.identity}`;
      }
    }
  }

  return {
    waterBodies: drafts.map((entry) => entry.draft),
    evidence: [],
    quarantined,
  };
}

/**
 * Source-agnostic entry point: routes artifacts to the right deterministic
 * normalizer by artifact-key scheme and merges the results.
 */
export function normalizeArtifacts(
  artifacts: SourceArtifact[],
  speciesIndex: SpeciesIndex,
): NormalizeResult {
  const gfch = artifacts.filter(
    (a) =>
      parseWaterKey(a.artifactKey) !== undefined ||
      parseGameFishKey(a.artifactKey) !== undefined,
  );
  const nhd = artifacts.filter((a) => parseNhdKey(a.artifactKey) !== undefined);

  const a = normalizeNjDepArtifacts(gfch, speciesIndex);
  const b = normalizeNhdArtifacts(nhd);
  return {
    waterBodies: [...a.waterBodies, ...b.waterBodies],
    evidence: [...a.evidence, ...b.evidence],
    quarantined: [...a.quarantined, ...b.quarantined],
  };
}
