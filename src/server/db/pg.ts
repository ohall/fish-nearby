import postgres from "postgres";

/**
 * Plain postgres-js query client factory, intentionally free of the Next.js
 * `server-only` guard so it can run in the standalone ingestion job as well as
 * in route handlers. The ingestion job runs outside Next.js.
 */
export function createQueryClient(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 10,
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });
}

export type PgQueryClient = ReturnType<typeof createQueryClient>;
