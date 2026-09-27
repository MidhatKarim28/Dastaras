"use client";

import { formatPKR } from "@dastaras/shared";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Hourglass, Inbox, Star, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { BookingItem } from "@/components/bookings/booking-item";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { api, unwrap } from "@/lib/api";
import { BookingsList, inGroup, ListSkeleton, NoBookingsYet, useBookings } from "./bookings-list";
import { MyListings } from "./my-listings";
import { ProfileEditor } from "./profile-editor";

const TABS = ["overview", "jobs", "listings", "profile", "my-bookings"] as const;
type Tab = (typeof TABS)[number];

export function ProviderDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "overview";
  const bookings = useBookings("provider");
  const pendingCount = bookings.data?.filter((b) => b.status === "pending").length;

  return (
    <div className="grid gap-6">
      <Tabs
        value={tab}
        onChange={(t) =>
          router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false })
        }
        items={[
          { value: "overview", label: "Overview", count: pendingCount },
          { value: "jobs", label: "All jobs" },
          { value: "listings", label: "My listings" },
          { value: "profile", label: "Profile" },
          { value: "my-bookings", label: "Services I booked" },
        ]}
      />
      {tab === "overview" && <Overview />}
      {tab === "jobs" && (
        <BookingsList
          as="provider"
          empty={
            <EmptyState icon={<Inbox />} title="No jobs yet">
              Requests from clients show up here.
            </EmptyState>
          }
        />
      )}
      {tab === "listings" && <MyListings />}
      {tab === "profile" && <ProfileEditor />}
      {tab === "my-bookings" && <BookingsList as="client" empty={<NoBookingsYet />} />}
    </div>
  );
}

function Overview() {
  const stats = useQuery({
    queryKey: ["me", "stats"],
    queryFn: async () => unwrap(await api().api.me.stats.$get()),
  });
  const bookings = useBookings("provider");

  const requests = bookings.data
    ?.filter((b) => b.status === "pending")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const upcoming = bookings.data
    ?.filter((b) => inGroup(b, ["accepted", "in_progress"]))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : stats.isError ? (
          <p className="col-span-full text-sm text-destructive">{stats.error.message}</p>
        ) : (
          <>
            <StatCard icon={<Hourglass />} label="New requests" value={stats.data.pending} />
            <StatCard icon={<CalendarCheck />} label="Upcoming jobs" value={stats.data.upcoming} />
            <StatCard
              icon={<Wallet />}
              label="Earned"
              value={formatPKR(stats.data.earnings)}
              sub={`${stats.data.completed} completed ${stats.data.completed === 1 ? "job" : "jobs"}`}
            />
            <StatCard
              icon={<Star />}
              label="Average rating"
              value={stats.data.totalReviews ? stats.data.avgRating.toFixed(2) : "–"}
              sub={`${stats.data.totalReviews} ${stats.data.totalReviews === 1 ? "review" : "reviews"}`}
            />
          </>
        )}
      </div>

      <Section title="Incoming requests" count={requests?.length}>
        {bookings.isPending ? (
          <ListSkeleton rows={2} />
        ) : !requests?.length ? (
          <EmptyState icon={<Inbox />} title="No pending requests">
            New booking requests will appear here for you to accept or decline.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {requests.map((b) => (
              <BookingItem key={b.id} booking={b} as="provider" />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Upcoming jobs" count={upcoming?.length}>
        {bookings.isPending ? (
          <ListSkeleton rows={2} />
        ) : !upcoming?.length ? (
          <EmptyState icon={<CheckCircle2 />} title="Nothing scheduled">
            Accepted jobs show up here until you mark them complete.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {upcoming.map((b) => (
              <BookingItem key={b.id} booking={b} as="provider" />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <Card className="grid gap-1 p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        {!!count && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}
