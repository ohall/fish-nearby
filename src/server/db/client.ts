import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type QueryClient = ReturnType<typeof postgres>;

export function createDatabaseClient(databaseUrl: string) {
  const queryClient = postgres(databaseUrl, {
    max: 10,
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return {
    database: drizzle(queryClient, { schema }),
    queryClient,
    close: () => queryClient.end(),
  };
}
