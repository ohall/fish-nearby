import { createQueryClient } from "../src/server/db/pg.ts";
import { NjDepArcGisAdapter } from "../src/server/ingestion/njdep-arcgis.ts";
import { NjDepNhdAdapter } from "../src/server/ingestion/nhd-waterbody.ts";
import { runIngestion } from "../src/server/ingestion/pipeline.ts";
import type { SourceAdapter } from "../src/server/ingestion/types.ts";

const ADAPTERS: Record<string, () => SourceAdapter> = {
  gfch: () => new NjDepArcGisAdapter(),
  nhd: () => new NjDepNhdAdapter(),
};

async function main(): Promise<void> {
  const databaseUrl =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Set DIRECT_DATABASE_URL (or DATABASE_URL) to run ingestion.",
    );
  }

  const filter = process.argv[2];
  if (filter !== undefined && !(filter in ADAPTERS)) {
    throw new Error(
      `Unknown source "${filter}". Expected one of: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  const adapters = Object.entries(ADAPTERS)
    .filter(([name]) => filter === undefined || name === filter)
    .map(([, make]) => make());

  const sql = createQueryClient(databaseUrl);
  try {
    // Fail fast on an unreachable database rather than hanging.
    await sql`select 1`;

    for (const adapter of adapters) {
      const summary = await runIngestion(sql, adapter);
      // Structured, single-line result; coordinates stay out of logs.
      console.log(JSON.stringify(summary, null, 2));
      if (summary.status === "failed") {
        process.exitCode = 1;
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = describeError(error);
  process.stderr.write(`ingest failed: ${message}\n`);
  process.exitCode = 1;
});

function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map(describeError).join("; ");
  }
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}
