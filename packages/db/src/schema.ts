import { BOOKING_STATUSES } from "@dastaras/shared";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ───────────────────────────── Auth (Better Auth) ───────────────────────────── */

export const roleEnum = pgEnum("role", ["client", "provider", "admin"]);

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  role: roleEnum().notNull().default("client"),
  phone: text(),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ...timestamps,
});

/* ───────────────────────────── Catalog ───────────────────────────── */

export const category = pgTable("category", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull(),
  icon: text().notNull(), // lucide icon name
  sortOrder: integer().notNull().default(0),
});

export const service = pgTable(
  "service",
  {
    id: serial().primaryKey(),
    categoryId: integer()
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    slug: text().notNull().unique(),
    name: text().notNull(),
  },
  (t) => [index().on(t.categoryId)],
);

/* ───────────────────────────── Providers & listings ───────────────────────────── */

export const providerProfile = pgTable("provider_profile", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  headline: text().notNull(),
  bio: text(),
  city: text().notNull(),
  yearsExperience: integer().notNull().default(0),
  verified: boolean().notNull().default(false),
  ...timestamps,
});

export const listing = pgTable(
  "listing",
  {
    id: uuid().primaryKey().defaultRandom(),
    providerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceId: integer()
      .notNull()
      .references(() => service.id),
    title: text().notNull(),
    description: text().notNull(),
    hourlyRate: integer().notNull(),
    city: text().notNull(),
    area: text().notNull(),
    active: boolean().notNull().default(true),
    // Denormalised review aggregate, maintained transactionally when a review is written.
    ratingAvg: numeric({ precision: 3, scale: 2, mode: "number" }).notNull().default(0),
    ratingCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.providerId),
    index().on(t.serviceId),
    index().on(t.city),
    index("listing_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.title} || ' ' || ${t.description})`,
    ),
    check("listing_rate_positive", sql`${t.hourlyRate} > 0`),
  ],
);

/* ───────────────────────────── Bookings ───────────────────────────── */

export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);

export const booking = pgTable(
  "booking",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id),
    clientId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: bookingStatusEnum().notNull().default("pending"),
    scheduledAt: timestamp({ withTimezone: true }).notNull(),
    durationHours: integer().notNull(),
    // Price is snapshotted at booking time so later rate changes don't rewrite history.
    hourlyRate: integer().notNull(),
    totalAmount: integer().notNull(),
    address: text().notNull(),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    index().on(t.clientId, t.status),
    index().on(t.providerId, t.status),
    index().on(t.providerId, t.scheduledAt),
    check("booking_duration_range", sql`${t.durationHours} between 1 and 12`),
  ],
);

/** Append-only audit trail of every status change. */
export const bookingEvent = pgTable(
  "booking_event",
  {
    id: serial().primaryKey(),
    bookingId: uuid()
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    fromStatus: bookingStatusEnum(),
    toStatus: bookingStatusEnum().notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.bookingId)],
);

export const review = pgTable(
  "review",
  {
    id: serial().primaryKey(),
    bookingId: uuid()
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    listingId: uuid()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    reviewerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer().notNull(),
    comment: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.bookingId),
    index().on(t.listingId),
    check("review_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

/* ───────────────────────────── Relations ───────────────────────────── */

export const userRelations = relations(user, ({ one, many }) => ({
  providerProfile: one(providerProfile),
  listings: many(listing),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  services: many(service),
}));

export const serviceRelations = relations(service, ({ one, many }) => ({
  category: one(category, { fields: [service.categoryId], references: [category.id] }),
  listings: many(listing),
}));

export const providerProfileRelations = relations(providerProfile, ({ one }) => ({
  user: one(user, { fields: [providerProfile.userId], references: [user.id] }),
}));

export const listingRelations = relations(listing, ({ one, many }) => ({
  provider: one(user, { fields: [listing.providerId], references: [user.id] }),
  service: one(service, { fields: [listing.serviceId], references: [service.id] }),
  reviews: many(review),
}));

export const bookingRelations = relations(booking, ({ one, many }) => ({
  listing: one(listing, { fields: [booking.listingId], references: [listing.id] }),
  client: one(user, { fields: [booking.clientId], references: [user.id] }),
  provider: one(user, { fields: [booking.providerId], references: [user.id] }),
  events: many(bookingEvent),
  review: one(review),
}));

export const bookingEventRelations = relations(bookingEvent, ({ one }) => ({
  booking: one(booking, { fields: [bookingEvent.bookingId], references: [booking.id] }),
  actor: one(user, { fields: [bookingEvent.actorId], references: [user.id] }),
}));

export const reviewRelations = relations(review, ({ one }) => ({
  booking: one(booking, { fields: [review.bookingId], references: [booking.id] }),
  listing: one(listing, { fields: [review.listingId], references: [listing.id] }),
  reviewer: one(user, { fields: [review.reviewerId], references: [user.id] }),
}));
