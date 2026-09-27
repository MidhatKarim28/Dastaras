import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { auth } from "./auth";
import { pool } from "./db";
import { env } from "./env";
import { type AppEnv, withSession } from "./middleware";
import { bookingRoutes } from "./routes/bookings";
import { catalogRoutes } from "./routes/catalog";
import { listingRoutes } from "./routes/listings";
import { meRoutes } from "./routes/me";

const app = new Hono<AppEnv>().basePath("/api");

app.use(requestId());
if (env.NODE_ENV !== "test") app.use(logger());
app.use(secureHeaders());
app.use(
  cors({
    origin: [env.WEB_ORIGIN],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Better Auth owns everything under /api/auth.
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

app.use(withSession);

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(`[${c.get("requestId")}]`, err);
  return c.json({ error: "Something went wrong on our side" }, 500);
});
app.notFound((c) => c.json({ error: "Not found" }, 404));

const routes = app
  .get("/health", async (c) => {
    await pool.query("select 1");
    return c.json({ ok: true, time: new Date().toISOString() });
  })
  .route("/", catalogRoutes)
  .route("/", listingRoutes)
  .route("/", bookingRoutes)
  .route("/", meRoutes);

export type AppType = typeof routes;
export default app;
