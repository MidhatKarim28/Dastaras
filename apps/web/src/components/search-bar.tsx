import { CITIES } from "@dastaras/shared";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui/button";

/** Plain GET form → /services?q=&city=. Works without JavaScript. */
export function SearchBar({
  defaultQuery,
  defaultCity,
  className,
}: {
  defaultQuery?: string;
  defaultCity?: string;
  className?: string;
}) {
  return (
    <form
      action="/services"
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-lg sm:flex-row sm:items-center",
        className,
      )}
    >
      <label className="flex flex-1 items-center gap-2 px-3">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">What do you need?</span>
        <input
          name="q"
          defaultValue={defaultQuery}
          placeholder="AC repair, deep cleaning, electrician…"
          className="h-11 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div className="hidden h-8 w-px bg-border sm:block" />
      <label className="flex items-center gap-2 px-3">
        <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">City</span>
        <select
          name="city"
          defaultValue={defaultCity ?? ""}
          className="h-11 w-full bg-transparent text-base text-foreground outline-none sm:w-36"
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={buttonClass({ size: "lg", className: "sm:px-8" })}>
        Search
      </button>
    </form>
  );
}
