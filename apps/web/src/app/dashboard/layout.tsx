import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!(await getSessionUser())) redirect("/sign-in?next=/dashboard");
  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
}
