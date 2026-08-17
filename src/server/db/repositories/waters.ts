import "server-only";

import {
  nearbyWaterSearchRequestSchema,
  nearbyWaterSearchResponseSchema,
  waterDetailResponseSchema,
  type NearbyWaterSearchRequest,
  type NearbyWaterSearchResponse,
  type WaterDetailResponse,
} from "@/contracts";

import type { QueryClient } from "../client";

type NearbyWaterRow = {
  id: string;
  displayName: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  acceptedSpeciesCount: number;
};

type EvidenceRow = {
  waterBodyId: string;
  displayName: string;
  type: string;
  state: string;
  county: string | null;
  latitude: number;
  longitude: number;
  speciesId: string | null;
  speciesCommonName: string | null;
  speciesScientificName: string | null;
  evidenceId: string | null;
  evidenceType: string | null;
  observedOn: string | null;
  publishedOn: string | null;
  confidenceTier: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
};

export class WaterNotFoundError extends Error {
  constructor(readonly waterBodyId: string) {
    super("Water body not found");
    this.name = "WaterNotFoundError";
  }
}

export class WaterRepository {
  constructor(private readonly query: QueryClient) {}

  async searchNearby(
    request: NearbyWaterSearchRequest,
  ): Promise<NearbyWaterSearchResponse> {
    const input = nearbyWaterSearchRequestSchema.parse(request);

    const rows = await this.query<NearbyWaterRow[]>`
      with search_origin as (
        select public.fish_nearby_geography_point(
          ${input.longitude},
          ${input.latitude}
        ) as geog
      )
      select
        water.id,
        water.display_name as "displayName",
        water.type,
        public.fish_nearby_latitude(water.geom) as latitude,
        public.fish_nearby_longitude(water.geom) as longitude,
        public.fish_nearby_distance(
          water.geom,
          origin.geog
        ) as "distanceMeters",
        count(distinct evidence.species_id)::integer as "acceptedSpeciesCount"
      from public.public_water_body as water
      cross join search_origin as origin
      left join public.public_water_body_evidence as evidence
        on evidence.water_body_id = water.id
      where public.fish_nearby_dwithin(
        water.geom,
        origin.geog,
        ${input.radiusMeters}
      )
      group by water.id, water.display_name, water.type, water.geom, origin.geog
      order by "distanceMeters", lower(water.display_name)
      limit 200
    `;

    return nearbyWaterSearchResponseSchema.parse({
      waters: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        type: row.type,
        representativePoint: {
          latitude: row.latitude,
          longitude: row.longitude,
        },
        distanceMeters: row.distanceMeters,
        acceptedSpeciesCount: row.acceptedSpeciesCount,
      })),
    });
  }

  async findDetail(waterBodyId: string): Promise<WaterDetailResponse> {
    const id = waterDetailResponseSchema.shape.id.parse(waterBodyId);
    const rows = await this.query<EvidenceRow[]>`
      select
        water.id as "waterBodyId",
        water.display_name as "displayName",
        water.type,
        water.state,
        water.county,
        public.fish_nearby_latitude(water.geom) as latitude,
        public.fish_nearby_longitude(water.geom) as longitude,
        evidence.species_id as "speciesId",
        evidence.species_common_name as "speciesCommonName",
        evidence.species_scientific_name as "speciesScientificName",
        evidence.id as "evidenceId",
        evidence.evidence_type as "evidenceType",
        evidence.observed_on::text as "observedOn",
        evidence.published_on::text as "publishedOn",
        evidence.confidence_tier as "confidenceTier",
        evidence.source_label as "sourceLabel",
        evidence.source_url as "sourceUrl"
      from public.public_water_body as water
      left join public.public_water_body_evidence as evidence
        on evidence.water_body_id = water.id
      where water.id = ${id}
      order by
        evidence.species_common_name nulls last,
        evidence.observed_on desc nulls last,
        evidence.published_on desc nulls last,
        evidence.id
    `;

    const first = rows[0];
    if (!first) {
      throw new WaterNotFoundError(id);
    }

    const groupedSpecies = new Map<
      string,
      {
        id: string;
        commonName: string;
        scientificName?: string;
        evidence: Array<{
          id: string;
          evidenceType: string;
          sourceLabel: string;
          sourceUrl?: string;
          observedOn?: string;
          publishedOn?: string;
          confidenceTier: string;
        }>;
      }
    >();

    for (const row of rows) {
      if (
        !row.speciesId ||
        !row.speciesCommonName ||
        !row.evidenceId ||
        !row.evidenceType ||
        !row.confidenceTier ||
        !row.sourceLabel
      ) {
        continue;
      }

      const species = groupedSpecies.get(row.speciesId) ?? {
        id: row.speciesId,
        commonName: row.speciesCommonName,
        ...(row.speciesScientificName
          ? { scientificName: row.speciesScientificName }
          : {}),
        evidence: [],
      };

      species.evidence.push({
        id: row.evidenceId,
        evidenceType: row.evidenceType,
        sourceLabel: row.sourceLabel,
        ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
        ...(row.observedOn ? { observedOn: row.observedOn } : {}),
        ...(row.publishedOn ? { publishedOn: row.publishedOn } : {}),
        confidenceTier: row.confidenceTier,
      });
      groupedSpecies.set(row.speciesId, species);
    }

    return waterDetailResponseSchema.parse({
      id: first.waterBodyId,
      displayName: first.displayName,
      type: first.type,
      state: first.state,
      ...(first.county ? { county: first.county } : {}),
      representativePoint: {
        latitude: first.latitude,
        longitude: first.longitude,
      },
      species: [...groupedSpecies.values()],
    });
  }
}
