import { booking, bookingEvent, listing, review, service, user } from "@dastaras/db";
import {
  availableTransitions,
  bookingInputSchema,
  bookingListQuerySchema,
  bookingTransitionSchema,
  reviewInputSchema,
} from "@dastaras/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db";
import { actorFor, createBooking, reviewBooking, transitionBooking } from "../lib/bookings";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, requireAuth } from "../middleware";

const idParam = z.object({ id: z.uuid("Invalid booking id") });
const client = alias(user, "client");
const provider = alias(user, "provider");

const bookingSummary = {
  id: booking.id,
  status: booking.status,
  scheduledAt: booking.scheduledAt,
  durationHours: booking.durationHours,
  hourlyRate: booking.hourlyRate,
  totalAmount: booking.totalAmount,
  address: booking.address,
  notes: booking.notes,
  createdAt: booking.createdAt,
  listing: { id: listing.id, title: listing.title },
  service: { name: service.name },
  client: { id: client.id, name: client.name, image: client.image },
  provider: { id: provider.id, name: provider.name, image: provider.image },
  reviewId: review.id,
};

function summaryQuery() {
  return db
    .select(bookingSummary)
    .from(booking)
    .innerJoin(listing, eq(listing.id, booking.listingId))
    .innerJoin(service, eq(service.id, listing.serviceId))
    .innerJoin(client, eq(client.id, booking.clientId))
    .innerJoin(provider, eq(provider.id, booking.providerId))
    .leftJoin(review, eq(review.bookingId, booking.id));
}

export const bookingRoutes = new Hono<AppEnv>()
  .use("/bookings/*", requireAuth)
  .use("/bookings", requireAuth)
  .get("/bookings", validate("query", bookingListQuerySchema), async (c) => {
    const me = currentUser(c);
    const { as, status } = c.req.valid("query");
    const mine = as === "provider" ? eq(booking.providerId, me.id) : eq(booking.clientId, me.id);
    const rows = await summaryQuery()
      .where(and(mine, status ? eq(booking.status, status) : undefined))
      .orderBy(desc(booking.scheduledAt))
      .limit(100);
    return c.json(rows.map((r) => ({ ...r, actions: availableTransitions(r.status, as) })));
  })
  .post("/bookings", validate("json", bookingInputSchema), async (c) => {
    const me = currentUser(c);
    const created = await createBooking(me.id, c.req.valid("json"));
    return c.json(created, 201);
  })
  .get("/bookings/:id", validate("param", idParam), async (c) => {
    const me = currentUser(c);
    const { id } = c.req.valid("param");
    const [row] = await summaryQuery().where(eq(booking.id, id)).limit(1);
    const actor = row && actorFor({ clientId: row.client.id, providerId: row.provider.id }, me.id);
    if (!row || !actor) throw new HTTPException(404, { message: "Booking not found" });

    const [events, rev] = await Promise.all([
      db
        .select({
          id: bookingEvent.id,
          fromStatus: bookingEvent.fromStatus,
          toStatus: bookingEvent.toStatus,
          note: bookingEvent.note,
          createdAt: bookingEvent.createdAt,
          actorName: user.name,
        })
        .from(bookingEvent)
        .leftJoin(user, eq(user.id, bookingEvent.actorId))
        .where(eq(bookingEvent.bookingId, id))
        .orderBy(asc(bookingEvent.createdAt), asc(bookingEvent.id)),
      db.query.review.findFirst({ where: eq(review.bookingId, id) }),
    ]);

    return c.json({
      ...row,
      viewerRole: actor,
      actions: availableTransitions(row.status, actor),
      canReview: actor === "client" && row.status === "completed" && !rev,
      review: rev ? { rating: rev.rating, comment: rev.comment, createdAt: rev.createdAt } : null,
      events,
    });
  })
  .post(
    "/bookings/:id/transition",
    validate("param", idParam),
    validate("json", bookingTransitionSchema),
    async (c) => {
      const me = currentUser(c);
      const { id } = c.req.valid("param");
      const { to, note } = c.req.valid("json");
      return c.json(await transitionBooking(id, me.id, to, note));
    },
  )
  .post(
    "/bookings/:id/review",
    validate("param", idParam),
    validate("json", reviewInputSchema),
    async (c) => {
      const me = currentUser(c);
      const { id } = c.req.valid("param");
      return c.json(await reviewBooking(id, me.id, c.req.valid("json")), 201);
    },
  );
