import { describe, expect, it } from "vitest";
import {
  DatabaseSetupRequiredError,
  UnsafeDatabaseUrlError,
  assertProductionSeedAllowed,
  getMigrationDatabaseUrl,
  getRuntimeDatabaseConfig,
  isLocalDatabaseUrl
} from "@eduferma/db";

describe("database config guardrails", () => {
  it("requires DATABASE_URL before runtime DB use", () => {
    expect(() => getRuntimeDatabaseConfig({})).toThrow(DatabaseSetupRequiredError);
  });

  it("rejects non-Postgres URLs", () => {
    expect(() => getRuntimeDatabaseConfig({ DATABASE_URL: "file:./local.db" })).toThrow(UnsafeDatabaseUrlError);
  });

  it("allows local Postgres for development only", () => {
    const config = getRuntimeDatabaseConfig({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/eduferma",
      NODE_ENV: "development"
    });

    expect(config.isRemote).toBe(false);
    expect(isLocalDatabaseUrl(config.databaseUrl)).toBe(true);
  });

  it("rejects local Postgres in production", () => {
    expect(() =>
      getRuntimeDatabaseConfig({
        DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/eduferma",
        VERCEL_ENV: "production"
      })
    ).toThrow(UnsafeDatabaseUrlError);
  });

  it("prefers DIRECT_DATABASE_URL for migration commands", () => {
    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: "postgresql://runtime:pass@db.example.com:5432/eduferma",
        DIRECT_DATABASE_URL: "postgresql://direct:pass@db.example.com:5432/eduferma"
      })
    ).toBe("postgresql://direct:pass@db.example.com:5432/eduferma");
  });

  it("allows Drizzle generate to run before env setup", () => {
    expect(getMigrationDatabaseUrl({}, { required: false })).toBeUndefined();
  });

  it("requires an explicit production seed override", () => {
    expect(() =>
      assertProductionSeedAllowed(
        {
          DATABASE_URL: "postgresql://runtime:pass@db.example.com:5432/eduferma",
          VERCEL_ENV: "production"
        },
        ["node", "seed.ts", "--apply"]
      )
    ).toThrow(UnsafeDatabaseUrlError);

    expect(() =>
      assertProductionSeedAllowed(
        {
          DATABASE_URL: "postgresql://runtime:pass@db.example.com:5432/eduferma",
          VERCEL_ENV: "production",
          EDUFERMA_ALLOW_PRODUCTION_SEED: "true"
        },
        ["node", "seed.ts", "--apply", "--allow-production-seed"]
      )
    ).not.toThrow();
  });
});
