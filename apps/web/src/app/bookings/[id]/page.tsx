import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiError, unwrap } from "@/lib/api";
import { serverApi } from "@/lib/server";
import type { BookingDetail } from "@/lib/types";
import { BookingDetailView } from "./booking-detail";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await serverApi();
  let booking: BookingDetail;
  try {
    booking = await unwrap(await client.api.bookings[":id"].$get({ param: { id } }));
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect(`/sign-in?next=${encodeURIComponent(`/bookings/${id}`)}`);
      // Not a participant looks the same as not existing.
      if (err.status === 404 || err.status === 400) notFound();
    }
    throw err;
  }
  return <BookingDetailView initial={booking} />;
}
