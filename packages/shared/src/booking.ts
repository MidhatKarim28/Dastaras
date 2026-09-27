/**
 * Booking lifecycle as an explicit state machine.
 *
 *   pending ──accept──▶ accepted ──start──▶ in_progress ──complete──▶ completed
 *      │                   │
 *      ├──decline──▶ declined
 *      └──cancel───▶ cancelled ◀──cancel──┘
 *
 * Every transition names which party may perform it, so the API can
 * authorize a status change with a single lookup.
 */
export const BOOKING_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "in_progress",
  "completed",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingActor = "client" | "provider";

type Transition = { to: BookingStatus; by: readonly BookingActor[]; label: string };

export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly Transition[]> = {
  pending: [
    { to: "accepted", by: ["provider"], label: "Accept" },
    { to: "declined", by: ["provider"], label: "Decline" },
    { to: "cancelled", by: ["client"], label: "Cancel booking" },
  ],
  accepted: [
    { to: "in_progress", by: ["provider"], label: "Start job" },
    { to: "cancelled", by: ["client", "provider"], label: "Cancel booking" },
  ],
  in_progress: [{ to: "completed", by: ["provider"], label: "Mark complete" }],
  declined: [],
  cancelled: [],
  completed: [],
};

export const TERMINAL_STATUSES: readonly BookingStatus[] = ["declined", "cancelled", "completed"];

/** Statuses that occupy a provider's calendar. */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["accepted", "in_progress"];

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: BookingActor,
): boolean {
  return BOOKING_TRANSITIONS[from].some((t) => t.to === to && t.by.includes(actor));
}

export function availableTransitions(status: BookingStatus, actor: BookingActor): Transition[] {
  return BOOKING_TRANSITIONS[status].filter((t) => t.by.includes(actor));
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Awaiting provider",
  accepted: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
};

export function bookingTotal(hourlyRate: number, durationHours: number): number {
  return Math.round(hourlyRate * durationHours);
}
