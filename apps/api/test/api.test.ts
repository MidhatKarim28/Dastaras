import { beforeAll, describe, expect, it } from "vitest";
import { type Agent, anon, inDays, seedService, signUp, validListing } from "./helpers";

let provider: Agent;
let client: Agent;
let otherClient: Agent;
let listingId: string;

beforeAll(async () => {
  const svc = await seedService();
  provider = await signUp("provider", "Imran");
  client = await signUp("client", "Midhat");
  otherClient = await signUp("client", "Stranger");
  const res = await provider.post("/listings", validListing(svc.id));
  expect(res.status).toBe(201);
  listingId = res.body.id;
});

describe("auth & roles", () => {
  it("rejects anonymous access to private routes", async () => {
    expect((await anon("/me")).status).toBe(401);
    expect((await anon("/bookings")).status).toBe(401);
  });

  it("gives providers a profile automatically", async () => {
    const me = await provider.get("/me");
    expect(me.body.role).toBe("provider");
    expect(me.body.providerProfile).not.toBeNull();
  });

  it("does not let anyone self-assign the admin role", async () => {
    const res = await signUp("admin" as "client");
    expect((await res.get("/me")).body.role).toBe("client");
  });

  it("only lets providers create listings", async () => {
    const svc = await seedService();
    const res = await client.post("/listings", validListing(svc.id));
    expect(res.status).toBe(403);
  });
});

describe("listings", () => {
  it("validates input with helpful messages", async () => {
    const res = await provider.post("/listings", { serviceId: 1, title: "x" });
    expect(res.status).toBe(400);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it("is publicly searchable", async () => {
    const res = await anon("/listings?q=wiring&city=Lahore");
    expect(res.status).toBe(200);
    expect(res.body.items.some((i: { id: string }) => i.id === listingId)).toBe(true);
  });

  it("stops other users editing a listing", async () => {
    const res = await client.patch(`/listings/${listingId}`, { hourlyRate: 500 });
    expect(res.status).toBe(403);
  });
});

describe("booking lifecycle", () => {
  let bookingId: string;

  it("creates a booking with a price snapshot", async () => {
    const res = await client.post("/bookings", {
      listingId,
      scheduledAt: inDays(3),
      durationHours: 3,
      address: "House 1, Street 2, DHA Lahore",
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.totalAmount).toBe(4500);
    bookingId = res.body.id;
  });

  it("rejects bookings in the past", async () => {
    const res = await client.post("/bookings", {
      listingId,
      scheduledAt: "2020-01-01T10:00:00Z",
      durationHours: 1,
      address: "House 1, Street 2, DHA Lahore",
    });
    expect(res.status).toBe(400);
  });

  it("stops a provider booking their own listing", async () => {
    const res = await provider.post("/bookings", {
      listingId,
      scheduledAt: inDays(9),
      durationHours: 1,
      address: "House 1, Street 2, DHA Lahore",
    });
    expect(res.status).toBe(400);
  });

  it("hides the booking from unrelated users", async () => {
    expect((await otherClient.get(`/bookings/${bookingId}`)).status).toBe(404);
    expect(
      (await otherClient.post(`/bookings/${bookingId}/transition`, { to: "cancelled" })).status,
    ).toBe(404);
  });

  it("does not let the client accept their own booking", async () => {
    const res = await client.post(`/bookings/${bookingId}/transition`, { to: "accepted" });
    expect(res.status).toBe(409);
  });

  it("does not allow skipping states", async () => {
    const res = await provider.post(`/bookings/${bookingId}/transition`, { to: "completed" });
    expect(res.status).toBe(409);
  });

  it("walks pending → accepted → in_progress → completed", async () => {
    for (const to of ["accepted", "in_progress", "completed"]) {
      const res = await provider.post(`/bookings/${bookingId}/transition`, { to });
      expect(res.status, to).toBe(200);
      expect(res.body.status).toBe(to);
    }
    const detail = await client.get(`/bookings/${bookingId}`);
    expect(detail.body.events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      "pending",
      "accepted",
      "in_progress",
      "completed",
    ]);
    expect(detail.body.canReview).toBe(true);
  });

  it("accepts one review and updates the listing rating", async () => {
    expect((await provider.post(`/bookings/${bookingId}/review`, { rating: 5 })).status).toBe(403);
    const res = await client.post(`/bookings/${bookingId}/review`, { rating: 4, comment: "Good" });
    expect(res.status).toBe(201);
    const again = await client.post(`/bookings/${bookingId}/review`, { rating: 5 });
    expect(again.status).toBe(409);

    const listing = await anon(`/listings/${listingId}`);
    expect(listing.body.ratingCount).toBe(1);
    expect(listing.body.ratingAvg).toBe(4);
    expect(listing.body.reviews[0].comment).toBe("Good");
  });

  it("prevents double-booking a provider's confirmed slot", async () => {
    const a = await client.post("/bookings", {
      listingId,
      scheduledAt: inDays(5, 10),
      durationHours: 3,
      address: "House 1, Street 2, DHA Lahore",
    });
    const b = await otherClient.post("/bookings", {
      listingId,
      scheduledAt: inDays(5, 11),
      durationHours: 2,
      address: "House 9, Street 9, Gulberg Lahore",
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201); // both pending is fine…

    expect(
      (await provider.post(`/bookings/${a.body.id}/transition`, { to: "accepted" })).status,
    ).toBe(200);
    // …but once one is confirmed the overlapping one can't be accepted.
    const clash = await provider.post(`/bookings/${b.body.id}/transition`, { to: "accepted" });
    expect(clash.status).toBe(409);

    // And new requests for the confirmed slot are rejected up front.
    const c = await otherClient.post("/bookings", {
      listingId,
      scheduledAt: inDays(5, 12),
      durationHours: 1,
      address: "House 9, Street 9, Gulberg Lahore",
    });
    expect(c.status).toBe(409);
  });

  it("serialises concurrent accepts with a row lock", async () => {
    const res = await client.post("/bookings", {
      listingId,
      scheduledAt: inDays(12),
      durationHours: 1,
      address: "House 1, Street 2, DHA Lahore",
    });
    const results = await Promise.all([
      provider.post(`/bookings/${res.body.id}/transition`, { to: "accepted" }),
      provider.post(`/bookings/${res.body.id}/transition`, { to: "declined" }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("reports provider stats", async () => {
    const stats = await provider.get("/me/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.completed).toBe(1);
    expect(stats.body.earnings).toBe(4500);
    expect(stats.body.avgRating).toBe(4);
  });
});
