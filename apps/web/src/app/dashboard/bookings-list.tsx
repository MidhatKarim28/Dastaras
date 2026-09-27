"use client";

import type { BookingStatus } from "@dastaras/shared";
import { useQuery } from "@tanstack/react-query";
import { CalendarX2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { BookingItem } from "@/components/bookings/booking-item";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { api, unwrap } from "@/lib/api";
import type { BookingSummary } from "@/lib/types";

export function useBookings(as: "client" | "provider") {
  return useQuery({
    queryKey: ["bookings", as],
    queryFn: async () => unwrap(await api().api.bookings.$get({ query: { as } })),
  });
}

const GROUPS = {
  active: ["pending", "accepted", "in_progress"],
  completed: ["completed"],
  cancelled: ["declined", "cancelled"],
} satisfies Record<string, BookingStatus[]>;
type Group = keyof typeof GROUPS;

export function inGroup(b: BookingSummary, statuses: readonly BookingStatus[]) {
  return statuses.includes(b.status);
}

/** A party's bookings, split into Active / Completed / Cancelled tabs. */
export function BookingsList({ as, empty }: { as: "client" | "provider"; empty: ReactNode }) {
  const { data, isPending, isError, error } = useBookings(as);
  const [tab, setTab] = useState<Group>("active");

  if (isPending) return <ListSkeleton />;
  if (isError) return <p className="text-sm text-destructive">{error.message}</p>;

  const groups = {
    active: data
      .filter((b) => inGroup(b, GROUPS.active))
      // Soonest first for things still to happen.
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    completed: data.filter((b) => inGroup(b, GROUPS.completed)),
    cancelled: data.filter((b) => inGroup(b, GROUPS.cancelled)),
  };
  const shown = groups[tab];

  return (
    <div className="grid gap-4">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "active", label: "Active", count: groups.active.length },
          { value: "completed", label: "Completed", count: groups.completed.length },
          { value: "cancelled", label: "Cancelled & declined" },
        ]}
      />
      {data.length === 0 ? (
        empty
      ) : shown.length === 0 ? (
        <EmptyState icon={<CalendarX2 />} title={`No ${tab} bookings`} />
      ) : (
        <ul className="grid gap-3">
          {shown.map((b) => (
            <BookingItem key={b.id} booking={b} as={as} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function NoBookingsYet() {
  return (
    <EmptyState icon={<CalendarX2 />} title="No bookings yet">
      Find a trusted professional and book your first job.{" "}
      <Link href="/services" className="font-medium text-primary hover:underline">
        Browse services
      </Link>
    </EmptyState>
  );
}
