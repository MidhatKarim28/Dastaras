import { z } from "zod";
import { BOOKING_STATUSES } from "./booking";
import { CITIES, ROLES } from "./constants";

export const roleSchema = z.enum(ROLES);
export const citySchema = z.enum(CITIES);

export const listingInputSchema = z.object({
  serviceId: z.number().int().positive(),
  title: z.string().trim().min(8, "Give your listing a descriptive title").max(100),
  description: z.string().trim().min(30, "Tell clients a bit more (30+ characters)").max(2000),
  hourlyRate: z.number().int().min(300, "Minimum rate is Rs 300/hr").max(50_000),
  city: citySchema,
  area: z.string().trim().min(2).max(80),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

export const listingUpdateSchema = listingInputSchema.partial().extend({
  active: z.boolean().optional(),
});
export type ListingUpdate = z.infer<typeof listingUpdateSchema>;

export const LISTING_SORTS = [
  "recommended",
  "rating",
  "price_asc",
  "price_desc",
  "newest",
] as const;

export const listingQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  service: z.string().trim().max(80).optional(),
  city: citySchema.optional(),
  maxRate: z.coerce.number().int().positive().optional(),
  sort: z.enum(LISTING_SORTS).default("recommended"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const bookingInputSchema = z.object({
  listingId: z.uuid(),
  scheduledAt: z.iso
    .datetime({ offset: true })
    .refine((v) => new Date(v).getTime() > Date.now() + 30 * 60_000, {
      message: "Pick a time at least 30 minutes from now",
    }),
  durationHours: z.number().int().min(1).max(12),
  address: z.string().trim().min(8, "Enter the full address").max(250),
  notes: z.string().trim().max(1000).optional(),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const bookingTransitionSchema = z.object({
  to: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const bookingListQuerySchema = z.object({
  as: roleSchema.default("client"),
  status: z.enum(BOOKING_STATUSES).optional(),
});

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const providerProfileSchema = z.object({
  headline: z.string().trim().min(4).max(80),
  bio: z.string().trim().max(1500).optional(),
  city: citySchema,
  yearsExperience: z.number().int().min(0).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?92\d{10}$|^03\d{9}$/, "Use a Pakistani number, e.g. 03001234567")
    .optional(),
});
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
