import { serve } from "@hono/node-server";
import app from "./app";
import { pool } from "./db";
import { env } from "./env";

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`▲ Dastaras API listening on http://localhost:${info.port}/api`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
