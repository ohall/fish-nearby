import { describe, expect, it } from "vitest";

import {
  InvalidServerEnvironmentError,
  parseServerEnvironment,
} from "@/env/server";

describe("parseServerEnvironment", () => {
  it("accepts separate pooled and direct PostgreSQL URLs", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL:
        "postgresql://runtime:secret@pooler.example.test:6543/postgres",
      DIRECT_DATABASE_URL:
        "postgresql://migration:secret@db.example.test:5432/postgres",
    });

    expect(environment.DATABASE_URL).toContain("pooler.example.test");
    expect(environment.DIRECT_DATABASE_URL).toContain("db.example.test");
  });

  it("reports variable names without echoing secret values", () => {
    const secretValue = "not-a-database-url-super-secret";

    expect(() =>
      parseServerEnvironment({
        DATABASE_URL: secretValue,
      }),
    ).toThrowError(
      new InvalidServerEnvironmentError([
        "DATABASE_URL",
        "DIRECT_DATABASE_URL",
      ]),
    );

    try {
      parseServerEnvironment({ DATABASE_URL: secretValue });
    } catch (error) {
      expect(String(error)).not.toContain(secretValue);
    }
  });
});
