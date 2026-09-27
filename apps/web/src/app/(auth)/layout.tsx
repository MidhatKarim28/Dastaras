import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Demo accounts: <code className="font-mono">client@dastaras.dev</code> or{" "}
        <code className="font-mono">provider@dastaras.dev</code>, password{" "}
        <code className="font-mono">password123</code>
      </p>
    </div>
  );
}
