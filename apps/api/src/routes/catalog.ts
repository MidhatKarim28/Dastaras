import { category, listing, service } from "@dastaras/db";
import { and, asc, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";

async function listingCountsByService() {
  const rows = await db
    .select({ serviceId: listing.serviceId, n: count() })
    .from(listing)
    .where(eq(listing.active, true))
    .groupBy(listing.serviceId);
  return new Map(rows.map((r) => [r.serviceId, r.n]));
}

export const catalogRoutes = new Hono()
  .get("/categories", async (c) => {
    const [categories, counts] = await Promise.all([
      db.query.category.findMany({
        orderBy: [asc(category.sortOrder)],
        with: { services: { orderBy: [asc(service.name)] } },
      }),
      listingCountsByService(),
    ]);
    c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return c.json(
      categories.map((cat) => {
        const services = cat.services.map((s) => ({ ...s, listingCount: counts.get(s.id) ?? 0 }));
        return {
          ...cat,
          services,
          listingCount: services.reduce((sum, s) => sum + s.listingCount, 0),
        };
      }),
    );
  })
  .get("/categories/:slug", async (c) => {
    const cat = await db.query.category.findFirst({
      where: and(eq(category.slug, c.req.param("slug"))),
      with: { services: { orderBy: [asc(service.name)] } },
    });
    if (!cat) throw new HTTPException(404, { message: "Category not found" });
    return c.json(cat);
  });
