"use client";

import { CITIES } from "@dastaras/shared";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const SORT_LABELS = {
  recommended: "Recommended",
  rating: "Highest rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  newest: "Newest",
} as const;

/** Filters live in the URL, so every result page is shareable and server-rendered. */
export function Filters({
  categories,
  values,
}: {
  categories: { slug: string; name: string }[];
  values: Partial<Record<string, string>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function apply(form: HTMLFormElement) {
    const sp = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim()) sp.set(key, value.trim());
    }
    // Changing a filter always goes back to page 1.
    startTransition(() => router.push(`${pathname}?${sp}`, { scroll: false }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply(e.currentTarget);
  }

  // Remount when the URL changes (e.g. "Clear all") so uncontrolled inputs pick up new defaults.
  const key = JSON.stringify(values);

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <form
        key={key}
        onSubmit={onSubmit}
        onChange={(e) => {
          if ((e.target as HTMLElement).tagName === "SELECT") apply(e.currentTarget);
        }}
        className={cn(
          "grid gap-4 rounded-xl border bg-card p-4 transition-opacity",
          pending && "opacity-60",
        )}
      >
        <p className="flex items-center gap-2 font-medium">
          <SlidersHorizontal className="size-4" /> Filters
        </p>
        <Field label="Search" htmlFor="q">
          <Input id="q" name="q" defaultValue={values.q} placeholder="e.g. AC repair" />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={values.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="city">
          <Select id="city" name="city" defaultValue={values.city ?? ""}>
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Max hourly rate (Rs)" htmlFor="maxRate">
          <Input
            id="maxRate"
            name="maxRate"
            type="number"
            inputMode="numeric"
            min={1}
            step={100}
            defaultValue={values.maxRate}
            placeholder="Any"
          />
        </Field>
        <Field label="Sort by" htmlFor="sort">
          <Select id="sort" name="sort" defaultValue={values.sort ?? "recommended"}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" loading={pending}>
            Apply
          </Button>
          <Button
            variant="outline"
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          >
            Reset
          </Button>
        </div>
      </form>
    </aside>
  );
}
