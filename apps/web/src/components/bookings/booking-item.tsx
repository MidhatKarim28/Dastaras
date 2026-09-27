"use client";

import { formatPKR } from "@dastaras/shared";
import { CalendarClock, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import type { BookingSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { BookingActions } from "./booking-actions";
import { ReviewDialogButton } from "./review-form";
import { StatusBadge } from "./status-badge";

/** One booking in a dashboard list, seen by either party. */
export function BookingItem({
  booking,
  as,
}: {
  booking: BookingSummary;
  as: "client" | "provider";
}) {
  const other = as === "client" ? booking.provider : booking.client;
  const canReview = as === "client" && booking.status === "completed" && !booking.reviewId;

  return (
    <li className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <Avatar name={other.name} image={other.image} className="hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/bookings/${booking.id}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {booking.service.name}
            </Link>
            <StatusBadge status={booking.status} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {as === "client" ? "with" : "for"} {other.name} · {booking.listing.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-muted-foreground" />
              {formatDateTime(booking.scheduledAt)} · {booking.durationHours}h
            </span>
            {as === "provider" && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{booking.address}</span>
              </span>
            )}
          </div>
        </div>
        <p className="text-right font-semibold">{formatPKR(booking.totalAmount)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-wrap gap-2">
          <BookingActions bookingId={booking.id} actions={booking.actions} />
          {canReview && <ReviewDialogButton bookingId={booking.id} />}
        </div>
        <Link
          href={`/bookings/${booking.id}`}
          className="ml-auto flex items-center text-sm font-medium text-primary hover:underline"
        >
          Details <ChevronRight className="size-4" />
        </Link>
      </div>
    </li>
  );
}
