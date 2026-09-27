import { booking, bookingEvent, listing, review, type Tx } from "@dastaras/db";
import {
  BLOCKING_STATUSES,
  type BookingActor,
  type BookingInput,
  type BookingStatus,
  bookingTotal,
  canTransition,
  type ReviewInput,
} from "@dastaras/shared";
import { and, avg, count, eq, inArray, ne, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";

export class ConflictError extends HTTPException {
  constructor(message: string) {
    super(409, { message });
  }
}

export function actorFor(
  b: { clientId: string; providerId: string },
  userId: string,
): BookingActor | null {
  if (b.providerId === userId) return "provider";
  if (b.clientId === userId) return "client";
  return null;
}

async function lockBooking(tx: Tx, id: string) {
  const [row] = await tx.select().from(booking).where(eq(booking.id, id)).for("update");
  if (!row) throw new HTTPException(404, { message: "Booking not found" });
  return row;
}

/** Does the provider already have a confirmed job overlapping [start, start+hours)? */
async function hasOverlap(
  tx: Tx,
  providerId: string,
  start: Date,
  hours: number,
  excludeId?: string,
) {
  const end = new Date(start.getTime() + hours * 3_600_000);
  const [row] = await tx
    .select({ n: count() })
    .from(booking)
    .where(
      and(
        eq(booking.providerId, providerId),
        inArray(booking.status, [...BLOCKING_STATUSES]),
        excludeId ? ne(booking.id, excludeId) : undefined,
        sql`${booking.scheduledAt} < ${end.toISOString()}::timestamptz`,
        sql`${booking.scheduledAt} + make_interval(hours => ${booking.durationHours}) > ${start.toISOString()}::timestamptz`,
      ),
    );
  return (row?.n ?? 0) > 0;
}

export async function createBooking(clientId: string, input: BookingInput) {
  return db.transaction(async (tx) => {
    const l = await tx.query.listing.findFirst({ where: eq(listing.id, input.listingId) });
    if (!l || !l.active)
      throw new HTTPException(404, { message: "This listing is no longer available" });
    if (l.providerId === clientId)
      throw new HTTPException(400, { message: "You can't book your own listing" });

    const scheduledAt = new Date(input.scheduledAt);
    if (await hasOverlap(tx, l.providerId, scheduledAt, input.durationHours))
      throw new ConflictError("The provider is already booked for that time. Try another slot.");

    const [created] = await tx
      .insert(booking)
      .values({
        listingId: l.id,
        clientId,
        providerId: l.providerId,
        scheduledAt,
        durationHours: input.durationHours,
        hourlyRate: l.hourlyRate,
        totalAmount: bookingTotal(l.hourlyRate, input.durationHours),
        address: input.address,
        notes: input.notes,
      })
      .returning();
    await tx.insert(bookingEvent).values({
      bookingId: created!.id,
      actorId: clientId,
      fromStatus: null,
      toStatus: "pending",
    });
    return created!;
  });
}

export async function transitionBooking(
  id: string,
  userId: string,
  to: BookingStatus,
  note?: string,
) {
  return db.transaction(async (tx) => {
    // Row lock: two concurrent "accept" clicks can't both win.
    const b = await lockBooking(tx, id);
    const actor = actorFor(b, userId);
    if (!actor) throw new HTTPException(404, { message: "Booking not found" });
    if (!canTransition(b.status, to, actor))
      throw new ConflictError(`A ${actor} can't move a booking from "${b.status}" to "${to}"`);

    if (
      to === "accepted" &&
      (await hasOverlap(tx, b.providerId, b.scheduledAt, b.durationHours, b.id))
    )
      throw new ConflictError("You already have a confirmed job overlapping this time");

    const [updated] = await tx
      .update(booking)
      .set({ status: to })
      .where(eq(booking.id, id))
      .returning();
    await tx
      .insert(bookingEvent)
      .values({ bookingId: id, actorId: userId, fromStatus: b.status, toStatus: to, note });
    return updated!;
  });
}

export async function reviewBooking(id: string, userId: string, input: ReviewInput) {
  return db.transaction(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.clientId !== userId)
      throw new HTTPException(403, { message: "Only the client can review this booking" });
    if (b.status !== "completed")
      throw new ConflictError("You can review a booking once it's completed");

    const existing = await tx.query.review.findFirst({ where: eq(review.bookingId, id) });
    if (existing) throw new ConflictError("You've already reviewed this booking");

    const [created] = await tx
      .insert(review)
      .values({
        bookingId: id,
        listingId: b.listingId,
        reviewerId: userId,
        providerId: b.providerId,
        rating: input.rating,
        comment: input.comment,
      })
      .returning();

    // Keep the listing's aggregate in sync inside the same transaction.
    const [agg] = await tx
      .select({ avg: avg(review.rating), n: count() })
      .from(review)
      .where(eq(review.listingId, b.listingId));
    await tx
      .update(listing)
      .set({ ratingAvg: Number(agg?.avg ?? 0), ratingCount: agg?.n ?? 0 })
      .where(eq(listing.id, b.listingId));

    return created!;
  });
}
