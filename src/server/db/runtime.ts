import "server-only";

import { getServerEnvironment } from "@/env/server";

import { createDatabaseClient } from "./client";

type RuntimeDatabase = ReturnType<typeof createDatabaseClient>;

const sharedRuntime = globalThis as typeof globalThis & {
  fishNearbyDatabase?: RuntimeDatabase;
};

export function getRuntimeDatabase(): RuntimeDatabase {
  if (!sharedRuntime.fishNearbyDatabase) {
    const environment = getServerEnvironment();
    sharedRuntime.fishNearbyDatabase = createDatabaseClient(
      environment.DATABASE_URL,
    );
  }

  return sharedRuntime.fishNearbyDatabase;
}
