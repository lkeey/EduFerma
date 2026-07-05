import { buildDemoSeed } from "@eduferma/db";
import { demoData } from "@eduferma/core/platform";

const demoSeed = {
  mode: process.env.DATABASE_URL ? "db-ready" : "dry-run",
  note: process.env.DATABASE_URL
    ? "Demo records are stable and ready to upsert in the DB apply path."
    : "DATABASE_URL is not set, so this command prints the idempotent demo seed payload.",
  databaseSeed: buildDemoSeed(),
  ...demoData
};

console.log(JSON.stringify(demoSeed, null, 2));
