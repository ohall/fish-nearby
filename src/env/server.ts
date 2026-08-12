import { z } from "zod";

const postgresUrl = z
  .string()
  .url()
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    {
      message: "must be a PostgreSQL URL",
    },
  );

const serverEnvironmentSchema = z.object({
  DATABASE_URL: postgresUrl,
  DIRECT_DATABASE_URL: postgresUrl,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class InvalidServerEnvironmentError extends Error {
  readonly variableNames: string[];

  constructor(variableNames: string[]) {
    super(`Invalid server environment: ${variableNames.join(", ")}`);
    this.name = "InvalidServerEnvironmentError";
    this.variableNames = variableNames;
  }
}

export function parseServerEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(environment);

  if (result.success) {
    return result.data;
  }

  const variableNames = [
    ...new Set(
      result.error.issues.map((issue) => String(issue.path[0] ?? "unknown")),
    ),
  ].sort();

  throw new InvalidServerEnvironmentError(variableNames);
}

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}
