"use client";

import { BOOKING_STATUS_LABEL, type BookingStatus, formatPKR } from "@dastaras/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  StickyNote,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookingActions } from "@/components/bookings/booking-actions";
import { ReviewForm } from "@/components/bookings/review-form";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, Stars } from "@/components/ui/misc";
import { api, unwrap } from "@/lib/api";
import type { BookingDetail } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const NEXT_STEP: Record<BookingStatus, { client: string; provider: string }> = {
  pending: {
    client: "Waiting for the provider to accept your request.",
    provider: "Accept or decline this request. The client is waiting to hear back.",
  },
  accepted: {
    client: "Confirmed. Your provider will arrive at the scheduled time.",
    provider: "Confirmed. Start the job when you arrive.",
  },
  in_progress: {
    client: "The job is underway.",
    provider: "Mark the job complete when you're done.",
  },
  completed: {
    client: "All done. Thanks for booking with Dastaras.",
    provider: "Job completed. Nice work!",
  },
  declined: {
    client: "The provider couldn't take this one. Try another professional.",
    provider: "You declined this request.",
  },
  cancelled: { client: "This booking was cancelled.", provider: "This booking was cancelled." },
};

export function BookingDetailView({ initial }: { initial: BookingDetail }) {
  const isNew = useSearchParams().get("new") === "1";
  const { data: booking } = useQuery({
    queryKey: ["booking", initial.id],
    queryFn: async () =>
      unwrap(await api().api.bookings[":id"].$get({ param: { id: initial.id } })),
    initialData: initial,
  });

  const role = booking.viewerRole;
  const other = role === "client" ? booking.provider : booking.client;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      {isNew && booking.status === "pending" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm">
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
          <p>
            <span className="font-medium">Request sent!</span> {booking.provider.name} will confirm
            shortly. We&apos;ll keep this page updated.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          <header className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{booking.service.name}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <Link
              href={`/listings/${booking.listing.id}`}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              {booking.listing.title}
            </Link>
          </header>

          <Card>
            <CardContent className="grid gap-4 pt-5">
              <p className="text-sm">{NEXT_STEP[booking.status][role]}</p>
              <BookingActions bookingId={booking.id} actions={booking.actions} size="md" />
            </CardContent>
          </Card>

          {booking.canReview && (
            <Card>
              <CardHeader>
                <CardTitle>Rate {booking.provider.name.split(" ")[0]}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewForm bookingId={booking.id} />
              </CardContent>
            </Card>
          )}

          {booking.review && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {role === "client" ? "Your review" : "Client review"}
                  <Stars value={booking.review.rating} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {booking.review.comment ? (
                  <p className="leading-relaxed">{booking.review.comment}</p>
                ) : (
                  <p className="text-muted-foreground">No comment left.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative grid gap-5 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-px before:bg-border">
                {booking.events.map((ev) => (
                  <li key={ev.id} className="relative flex gap-3">
                    <TimelineDot status={ev.toStatus} />
                    <div className="grid gap-0.5">
                      <p className="text-sm font-medium">
                        {ev.fromStatus ? BOOKING_STATUS_LABEL[ev.toStatus] : "Booking requested"}
                        {ev.actorName && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            by {ev.actorName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(ev.createdAt)}
                      </p>
                      {ev.note && (
                        <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">“{ev.note}”</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="grid gap-4 pt-5 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={other.name} image={other.image} />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {role === "client" ? "Provider" : "Client"}
                  </p>
                  <p className="font-medium">{other.name}</p>
                </div>
              </div>
              <Detail icon={<CalendarClock />} label="When">
                {formatDateTime(booking.scheduledAt)}
              </Detail>
              <Detail icon={<Clock />} label="Duration">
                {booking.durationHours} {booking.durationHours === 1 ? "hour" : "hours"}
              </Detail>
              <Detail icon={<MapPin />} label="Address">
                {booking.address}
              </Detail>
              {booking.notes && (
                <Detail icon={<StickyNote />} label="Notes">
                  <span className="whitespace-pre-line">{booking.notes}</span>
                </Detail>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-1 pt-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {formatPKR(booking.hourlyRate)} × {booking.durationHours}h
                </span>
                <span>{formatPKR(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPKR(booking.totalAmount)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Price locked when requested on {formatDate(booking.createdAt)}. Pay the provider
                directly after the job.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}

function TimelineDot({ status }: { status: BookingStatus }) {
  const failed = status === "declined" || status === "cancelled";
  const Icon = failed ? XCircle : status === "pending" ? Circle : CheckCircle2;
  return (
    <span
      className={cn(
        "relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-card",
        failed ? "text-destructive" : "text-primary",
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
