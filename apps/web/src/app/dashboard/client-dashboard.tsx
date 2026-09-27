"use client";

import { BookingsList, NoBookingsYet } from "./bookings-list";

export function ClientDashboard() {
  return <BookingsList as="client" empty={<NoBookingsYet />} />;
}
