import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server";
import { ClientDashboard } from "./client-dashboard";
import { ProviderDashboard } from "./provider-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard");
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Salaam, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "provider"
            ? "Here's what's happening with your business."
            : "Keep track of your bookings."}
        </p>
      </div>
      {user.role === "provider" ? <ProviderDashboard /> : <ClientDashboard />}
    </>
  );
}
