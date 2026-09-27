import { CITIES, type City, LISTING_SORTS } from "@dastaras/shared";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { unwrap } from "@/lib/api";
import { serverApi } from "@/lib/server";
import { cn } from "@/lib/utils";
import { Filters } from "./filters";

export const metadata: Metadata = { title: "Browse services" };

type Params = {
  q?: string;
  category?: string;
  city?: City;
  maxRate?: string;
  sort?: (typeof LISTING_SORTS)[number];
  page?: string;
};

const oneOf = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  list.find((x) => x === v);

/** Keeps only well-formed filters so a hand-edited URL never turns into a 400. */
function cleanParams(raw: Record<string, string | string[] | undefined>): Params {
  const get = (key: string) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const numeric = (v: string | undefined, max: number) =>
    v && /^[1-9]\d*$/.test(v) && Number(v) <= max ? v : undefined;
  const params: Params = {
    q: get("q")?.slice(0, 100),
    category: get("category")?.slice(0, 60),
    city: oneOf(CITIES, get("city")),
    maxRate: numeric(get("maxRate"), 1_000_000),
    sort: oneOf(LISTING_SORTS, get("sort")),
    page: numeric(get("page"), 10_000),
  };
  // Drop empty keys so they don't show up as `?q=undefined` in pagination links.
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = cleanParams(await searchParams);
  const client = await serverApi();
  const [categories, results] = await Promise.all([
    unwrap(await client.api.categories.$get()),
    unwrap(await client.api.listings.$get({ query: { ...params, pageSize: "12" } })),
  ]);

  const activeCategory = categories.find((c) => c.slug === params.category);
  const heading = params.q ? `Results for “${params.q}”` : (activeCategory?.name ?? "All services");

  const pageHref = (page: number) => {
    const sp = new URLSearchParams({ ...params, page: String(page) });
    return `/services?${sp}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {results.total} {results.total === 1 ? "professional" : "professionals"}
          {params.city ? ` in ${params.city}` : " across Pakistan"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Filters
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          values={params}
        />

        <div>
          {results.items.length === 0 ? (
            <EmptyState icon={<SearchX />} title="No professionals match those filters">
              Try a different search term, another city or a higher budget.{" "}
              <Link href="/services" className="font-medium text-primary hover:underline">
                Clear all filters
              </Link>
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}

          {results.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <PageLink href={pageHref(results.page - 1)} disabled={results.page <= 1}>
                <ChevronLeft /> Previous
              </PageLink>
              <span className="px-3 text-sm text-muted-foreground">
                Page {results.page} of {results.totalPages}
              </span>
              <PageLink
                href={pageHref(results.page + 1)}
                disabled={results.page >= results.totalPages}
              >
                Next <ChevronRight />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className = buttonClass({ variant: "outline", size: "sm" });
  if (disabled)
    return (
      <span className={cn(className, "pointer-events-none opacity-50")} aria-disabled>
        {children}
      </span>
    );
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
