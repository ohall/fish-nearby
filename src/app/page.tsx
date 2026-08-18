import { connection } from "next/server";

import { MapExperience } from "@/features/map/map-experience";
import { getRuntimeDatabase } from "@/server/db/runtime";
import { WaterRepository } from "@/server/db/repositories/waters";

const NORTH_JERSEY_CENTER = {
  latitude: 41.07,
  longitude: -74.38,
  radiusMeters: 50_000,
};

export default async function HomePage() {
  await connection();

  const { queryClient } = getRuntimeDatabase();
  const repository = new WaterRepository(queryClient);
  const { waters } = await repository.listForMap(NORTH_JERSEY_CENTER);

  return <MapExperience waters={waters} />;
}
