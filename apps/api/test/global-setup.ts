import { fileURLToPath } from "node:url";
import { createDb } from "@dastaras/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgres://dastaras:dastaras@localhost:5432/dastaras_test";
  const { db, pool } = createDb(url);
  await pool.query(
    "drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;",
  );
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../../packages/db/drizzle", import.meta.url)),
  });
  await pool.end();
}
