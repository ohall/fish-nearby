import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabaseClient(databaseUrl: string) {
  const queryClient = postgres(databaseUrl, {
    max: 10,
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return {
    database: drizzle(queryClient),
    close: () => queryClient.end(),
  };
}
