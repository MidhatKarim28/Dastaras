import { category, listing, providerProfile, review, service, user } from "@dastaras/db";
import {
  type ListingQuery,
  listingInputSchema,
  listingQuerySchema,
  listingUpdateSchema,
} from "@dastaras/shared";
import { and, asc, count, desc, eq, ilike, lte, or, type SQL, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, requireAuth, requireRole } from "../middleware";

const idParam = z.object({ id: z.uuid("Invalid listing id") });

/** Shape shared by search results and dashboards. */
export const listingCardSelect = {
  id: listing.id,
  title: listing.title,
  hourlyRate: listing.hourlyRate,
  city: listing.city,
  area: listing.area,
  active: listing.active,
  ratingAvg: listing.ratingAvg,
  ratingCount: listing.ratingCount,
  createdAt: listing.createdAt,
  service: { id: service.id, name: service.name, slug: service.slug },
  category: { name: category.name, slug: category.slug, icon: category.icon },
  provider: {
    id: user.id,
    name: user.name,
    image: user.image,
    verified: providerProfile.verified,
    yearsExperience: providerProfile.yearsExperience,
  },
};

function searchConditions(q: ListingQuery) {
  const where: SQL[] = [eq(listing.active, true)];
  if (q.q) {
    const term = `%${q.q.replace(/[%_]/g, "\\$&")}%`;
    where.push(
      or(
        sql`to_tsvector('english', ${listing.title} || ' ' || ${listing.description}) @@ plainto_tsquery('english', ${q.q})`,
        ilike(listing.title, term),
        ilike(service.name, term),
        ilike(category.name, term),
      )!,
    );
  }
  if (q.category) where.push(eq(category.slug, q.category));
  if (q.service) where.push(eq(service.slug, q.service));
  if (q.city) where.push(eq(listing.city, q.city));
  if (q.maxRate) where.push(lte(listing.hourlyRate, q.maxRate));
  return and(...where);
}

const ORDER_BY = {
  // Rating weighted by review volume, so one 5★ review doesn't outrank fifty 4.8★ ones.
  recommended: [
    desc(sql`${listing.ratingAvg} * ln(${listing.ratingCount} + 2)`),
    desc(listing.createdAt),
  ],
  rating: [desc(listing.ratingAvg), desc(listing.ratingCount)],
  price_asc: [asc(listing.hourlyRate)],
  price_desc: [desc(listing.hourlyRate)],
  newest: [desc(listing.createdAt)],
} as const;

function baseListingQuery() {
  return db
    .select(listingCardSelect)
    .from(listing)
    .innerJoin(service, eq(service.id, listing.serviceId))
    .innerJoin(category, eq(category.id, service.categoryId))
    .innerJoin(user, eq(user.id, listing.providerId))
    .leftJoin(providerProfile, eq(providerProfile.userId, listing.providerId));
}

export const listingRoutes = new Hono<AppEnv>()
  .get("/listings", validate("query", listingQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const where = searchConditions(q);
    const [items, [total]] = await Promise.all([
      baseListingQuery()
        .where(where)
        .orderBy(...ORDER_BY[q.sort])
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      db
        .select({ n: count() })
        .from(listing)
        .innerJoin(service, eq(service.id, listing.serviceId))
        .innerJoin(category, eq(category.id, service.categoryId))
        .where(where),
    ]);
    const n = total?.n ?? 0;
    return c.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total: n,
      totalPages: Math.max(1, Math.ceil(n / q.pageSize)),
    });
  })
  .get("/listings/:id", validate("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const [row] = await baseListingQuery().where(eq(listing.id, id)).limit(1);
    if (!row || (!row.active && row.provider.id !== c.get("user")?.id))
      throw new HTTPException(404, { message: "Listing not found" });

    const [details, profile, reviews] = await Promise.all([
      db.query.listing.findFirst({
        where: eq(listing.id, id),
        columns: { description: true },
      }),
      db.query.providerProfile.findFirst({ where: eq(providerProfile.userId, row.provider.id) }),
      db
        .select({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          reviewer: { name: user.name, image: user.image },
        })
        .from(review)
        .innerJoin(user, eq(user.id, review.reviewerId))
        .where(eq(review.listingId, id))
        .orderBy(desc(review.createdAt))
        .limit(20),
    ]);

    return c.json({
      ...row,
      description: details?.description ?? "",
      providerProfile: profile
        ? {
            headline: profile.headline,
            bio: profile.bio,
            city: profile.city,
            yearsExperience: profile.yearsExperience,
            verified: profile.verified,
            memberSince: profile.createdAt,
          }
        : null,
      reviews,
    });
  })
  .post("/listings", requireRole("provider"), validate("json", listingInputSchema), async (c) => {
    const input = c.req.valid("json");
    const user = currentUser(c);
    const svc = await db.query.service.findFirst({ where: eq(service.id, input.serviceId) });
    if (!svc) throw new HTTPException(400, { message: "Unknown service" });
    const [created] = await db
      .insert(listing)
      .values({ ...input, providerId: user.id })
      .returning();
    return c.json(created!, 201);
  })
  .patch(
    "/listings/:id",
    requireAuth,
    validate("param", idParam),
    validate("json", listingUpdateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const me = currentUser(c);
      const existing = await db.query.listing.findFirst({ where: eq(listing.id, id) });
      if (!existing) throw new HTTPException(404, { message: "Listing not found" });
      if (existing.providerId !== me.id)
        throw new HTTPException(403, { message: "You can only edit your own listings" });
      const [updated] = await db.update(listing).set(input).where(eq(listing.id, id)).returning();
      return c.json(updated!);
    },
  );
