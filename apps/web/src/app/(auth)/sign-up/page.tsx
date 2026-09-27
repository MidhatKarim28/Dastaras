import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server";
import { safeNext } from "@/lib/utils";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSessionUser()) redirect(next);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Book trusted pros, or grow your business as one.
      </p>
      <AuthForm
        mode="sign-up"
        next={next}
        initialRole={params.role === "provider" ? "provider" : "client"}
      />
    </>
  );
}
