"use client";

import { bookingTotal, formatPKR } from "@dastaras/shared";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ApiError, api, unwrap } from "@/lib/api";
import { TIME_ZONE } from "@/lib/utils";

// 7:00 AM – 9:00 PM in 30-minute slots.
const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const h12 = ((Math.floor(minutes / 60) + 11) % 12) + 1;
  return { value: `${hh}:${mm}`, label: `${h12}:${mm} ${minutes < 720 ? "AM" : "PM"}` };
});

/** Today's date in Pakistan as YYYY-MM-DD (the <input type="date"> format). */
function todayInPakistan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

type Viewer = "anonymous" | "signed-in" | "owner";

export function BookingForm({
  listingId,
  hourlyRate,
  providerFirstName,
  viewer,
  active,
}: {
  listingId: string;
  hourlyRate: number;
  providerFirstName: string;
  viewer: Viewer;
  active: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [hours, setHours] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const total = bookingTotal(hourlyRate, hours);

  const book = useMutation({
    mutationFn: async (json: {
      listingId: string;
      scheduledAt: string;
      durationHours: number;
      address: string;
      notes?: string;
    }) => unwrap(await api().api.bookings.$post({ json })),
    onSuccess: (booking) => router.push(`/bookings/${booking.id}?new=1`),
    onError: (err) => {
      if (err instanceof ApiError && err.issues?.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const date = String(data.get("date") ?? "");
    const time = String(data.get("time") ?? "");
    const notes = String(data.get("notes") ?? "").trim();
    setErrors({});
    book.mutate({
      listingId,
      // The job happens in Pakistan: interpret the chosen slot as PKT (UTC+5, no DST).
      scheduledAt: new Date(`${date}T${time}:00+05:00`).toISOString(),
      durationHours: hours,
      address: String(data.get("address") ?? ""),
      notes: notes || undefined,
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="text-2xl font-semibold">{formatPKR(hourlyRate)}</span>
          <span className="text-muted-foreground"> / hour</span>
        </p>
      </div>

      {viewer === "owner" ? (
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
          <p>This is your listing{active ? "" : ". It's paused, so clients can't find it"}.</p>
          <Link href="/dashboard?tab=listings" className={buttonClass({ variant: "outline" })}>
            Manage in dashboard
          </Link>
        </div>
      ) : viewer === "anonymous" ? (
        <div className="mt-4 grid gap-3">
          <p className="text-sm text-muted-foreground">
            Sign in to book {providerFirstName}. It only takes a minute.
          </p>
          <Link
            href={`/sign-in?next=${encodeURIComponent(pathname)}`}
            className={buttonClass({ size: "lg" })}
          >
            Sign in to book
          </Link>
          <Link
            href={`/sign-up?next=${encodeURIComponent(pathname)}`}
            className={buttonClass({ variant: "outline" })}
          >
            Create an account
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="date" error={errors.scheduledAt}>
              <Input id="date" name="date" type="date" required min={todayInPakistan()} />
            </Field>
            <Field label="Start time" htmlFor="time">
              <Select id="time" name="time" required defaultValue="10:00">
                {TIME_SLOTS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Duration" htmlFor="hours">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHours((h) => Math.max(1, h - 1))}
                disabled={hours <= 1}
                aria-label="Fewer hours"
              >
                <Minus />
              </Button>
              <output id="hours" className="min-w-20 text-center font-medium" aria-live="polite">
                {hours} {hours === 1 ? "hour" : "hours"}
              </output>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHours((h) => Math.min(12, h + 1))}
                disabled={hours >= 12}
                aria-label="More hours"
              >
                <Plus />
              </Button>
            </div>
          </Field>

          <Field label="Address" htmlFor="address" error={errors.address}>
            <Textarea
              id="address"
              name="address"
              required
              minLength={8}
              maxLength={250}
              rows={2}
              className="min-h-0"
              placeholder="House 12, Street 4, DHA Phase 5"
            />
          </Field>

          <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              maxLength={1000}
              rows={3}
              className="min-h-0"
              placeholder="Describe the job, parking, gate code…"
            />
          </Field>

          <dl className="grid gap-1 rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>
                {formatPKR(hourlyRate)} × {hours} {hours === 1 ? "hour" : "hours"}
              </dt>
              <dd>{formatPKR(total)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatPKR(total)}</dd>
            </div>
          </dl>

          <Button type="submit" size="lg" loading={book.isPending}>
            Request booking
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            You won&apos;t be charged now. {providerFirstName} confirms the request first, and you
            can cancel any time before the job starts.
          </p>
        </form>
      )}
    </Card>
  );
}
