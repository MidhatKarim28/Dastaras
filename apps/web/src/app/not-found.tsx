import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <SearchX className="size-8" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">It may have been removed, or the link might be wrong.</p>
      <div className="flex gap-2">
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          Go home
        </Link>
        <Link href="/services" className={buttonClass()}>
          Browse services
        </Link>
      </div>
    </div>
  );
}
