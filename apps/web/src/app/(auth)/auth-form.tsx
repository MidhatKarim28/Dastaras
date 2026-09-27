"use client";

import { PASSWORD_MIN_LENGTH } from "@dastaras/shared";
import { Briefcase, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput, type PasswordRule } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Role = "client" | "provider";

const SIGN_UP_PASSWORD_RULES: PasswordRule[] = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
    progress: (v) => `${PASSWORD_MIN_LENGTH - v.length} more`,
  },
];

export function AuthForm({
  mode,
  next,
  initialRole = "client",
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  initialRole?: Role;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setError(null);
    setPending(true);

    const { error } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            name: String(data.get("name") ?? "").trim(),
            email,
            password,
            role,
          });

    if (error) {
      setPending(false);
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    // New providers land on their profile so they can set up before listing a service.
    const target =
      mode === "sign-up" && role === "provider" && next === "/dashboard"
        ? "/dashboard?tab=profile"
        : next;
    router.replace(target);
    router.refresh();
  }

  const otherHref = `${mode === "sign-in" ? "/sign-up" : "/sign-in"}${
    next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {mode === "sign-up" && (
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 text-sm font-medium">I want to…</legend>
          <RoleOption
            active={role === "client"}
            onSelect={() => setRole("client")}
            icon={<Home />}
            title="Book services"
            subtitle="I'm a client"
          />
          <RoleOption
            active={role === "provider"}
            onSelect={() => setRole("provider")}
            icon={<Briefcase />}
            title="Offer services"
            subtitle="I'm a provider"
          />
        </fieldset>
      )}

      {mode === "sign-up" && (
        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </Field>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={PASSWORD_MIN_LENGTH}
          rules={mode === "sign-up" ? SIGN_UP_PASSWORD_RULES : undefined}
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending}>
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? "New to Dastaras? " : "Already have an account? "}
        <Link href={otherHref} className="font-medium text-primary hover:underline">
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

function RoleOption({
  active,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors [&_svg]:size-5",
        active
          ? "border-primary bg-primary-soft text-primary ring-1 ring-primary"
          : "hover:bg-muted",
      )}
    >
      {icon}
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
