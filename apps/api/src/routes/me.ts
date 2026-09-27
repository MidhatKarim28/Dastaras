import { booking, category, listing, providerProfile, service, user } from "@dastaras/db";
import { providerProfileSchema } from "@dastaras/shared";
import { and, count, desc, eq, gte, inArray, sum } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, requireAuth, requireRole } from "../middleware";
import { listingCardSelect } from "./listings";

export const meRoutes = new Hono<AppEnv>()
  .use("/me/*", requireAuth)
  .use("/me", requireAuth)
  .get("/me", async (c) => {
    const me = currentUser(c);
    const profile = await db.query.providerProfile.findFirst({
      where: eq(providerProfile.userId, me.id),
    });
    return c.json({
      id: me.id,
      name: me.name,
      email: me.email,
      image: me.image ?? null,
      role: me.role as "client" | "provider" | "admin",
      phone: (me.phone as string | null | undefined) ?? null,
      providerProfile: profile ?? null,
    });
  })
  .put(
    "/me/provider-profile",
    requireRole("provider"),
    validate("json", providerProfileSchema),
    async (c) => {
      const me = currentUser(c);
      const { phone, ...profile } = c.req.valid("json");
      const [saved] = await db.transaction(async (tx) => {
        if (phone !== undefined) await tx.update(user).set({ phone }).where(eq(user.id, me.id));
        return tx
          .insert(providerProfile)
          .values({ userId: me.id, ...profile })
          .onConflictDoUpdate({ target: providerProfile.userId, set: profile })
          .returning();
      });
      return c.json(saved!);
    },
  )
  .get("/me/listings", requireRole("provider"), async (c) => {
    const me = currentUser(c);
    const rows = await db
      .select(listingCardSelect)
      .from(listing)
      .innerJoin(service, eq(service.id, listing.serviceId))
      .innerJoin(category, eq(category.id, service.categoryId))
      .innerJoin(user, eq(user.id, listing.providerId))
      .leftJoin(providerProfile, eq(providerProfile.userId, listing.providerId))
      .where(eq(listing.providerId, me.id))
      .orderBy(desc(listing.createdAt));
    return c.json(rows);
  })
  .get("/me/stats", requireRole("provider"), async (c) => {
    const me = currentUser(c);
    const mine = eq(booking.providerId, me.id);
    const [byStatus, [earnings], [upcoming], listings] = await Promise.all([
      db
        .select({ status: booking.status, n: count() })
        .from(booking)
        .where(mine)
        .groupBy(booking.status),
      db
        .select({ total: sum(booking.totalAmount) })
        .from(booking)
        .where(and(mine, eq(booking.status, "completed"))),
      db
        .select({ n: count() })
        .from(booking)
        .where(
          and(mine, inArray(booking.status, ["accepted"]), gte(booking.scheduledAt, new Date())),
        ),
      db
        .select({ avg: listing.ratingAvg, n: listing.ratingCount })
        .from(listing)
        .where(eq(listing.providerId, me.id)),
    ]);
    const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<
      string,
      number
    >;
    const totalReviews = listings.reduce((s, l) => s + l.n, 0);
    const avgRating = totalReviews
      ? listings.reduce((s, l) => s + l.avg * l.n, 0) / totalReviews
      : 0;
    return c.json({
      pending: counts.pending ?? 0,
      upcoming: upcoming?.n ?? 0,
      completed: counts.completed ?? 0,
      earnings: Number(earnings?.total ?? 0),
      avgRating: Math.round(avgRating * 100) / 100,
      totalReviews,
    });
  });
