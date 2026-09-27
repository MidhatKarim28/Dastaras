import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="17.5" cy="7" r="2" fill="var(--accent)" />
        </svg>
      </span>
      <span className="text-lg tracking-tight">Dastaras</span>
      <span className="hidden text-sm text-muted-foreground sm:inline" lang="ur" dir="rtl">
        دسترس
      </span>
    </Link>
  );
}
