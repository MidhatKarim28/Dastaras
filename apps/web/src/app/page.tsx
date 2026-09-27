import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  Search,
  Star,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { buttonClass } from "@/components/ui/button";
import { unwrap } from "@/lib/api";
import { CategoryIcon } from "@/lib/icons";
import { serverApi } from "@/lib/server";

export default async function HomePage() {
  const client = await serverApi();
  const [categories, topRated] = await Promise.all([
    unwrap(await client.api.categories.$get()),
    unwrap(await client.api.listings.$get({ query: { sort: "recommended", pageSize: "6" } })),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-hero text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60rem_30rem_at_85%_-10%,oklch(0.7_0.14_170/.55),transparent),radial-gradient(40rem_24rem_at_0%_110%,oklch(0.8_0.15_75/.35),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24">
          <div className="grid max-w-2xl gap-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/20">
              <BadgeCheck className="size-4 text-accent" aria-hidden /> Vetted local professionals
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Home services you can trust, <span className="text-accent">within reach.</span>
            </h1>
            <p className="text-lg text-pretty text-white/80">
              Book electricians, cleaners, AC technicians, plumbers and carers across Pakistan. Pay
              by the hour, with the price agreed upfront.
            </p>
          </div>
          <SearchBar className="max-w-3xl text-foreground" />
          <div className="flex flex-wrap gap-2 text-sm text-white/80">
            <span>Popular:</span>
            {["AC service", "Deep cleaning", "Electrician", "Plumber"].map((q) => (
              <Link
                key={q}
                href={`/services?q=${encodeURIComponent(q)}`}
                className="rounded-full bg-white/10 px-3 py-0.5 ring-1 ring-white/15 hover:bg-white/20"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeading
          title="Browse by category"
          subtitle="Whatever needs doing around the house"
          href="/services"
          linkLabel="All services"
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services?category=${cat.slug}`}
              className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={cat.icon} className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {cat.listingCount} {cat.listingCount === 1 ? "pro" : "pros"} available
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <HowItWorks
            title="How it works for clients"
            steps={[
              {
                icon: <Search />,
                title: "Find a pro",
                body: "Compare ratings, rates and reviews.",
              },
              {
                icon: <CalendarCheck />,
                title: "Book a time",
                body: "Pick a slot and how many hours you need. The total is shown upfront.",
              },
              {
                icon: <Star />,
                title: "Get it done",
                body: "Track the job from request to completion, then leave a review.",
              },
            ]}
          />
          <HowItWorks
            title="How it works for providers"
            steps={[
              {
                icon: <UserPlus />,
                title: "Create a profile",
                body: "Sign up as a provider and tell clients about your experience.",
              },
              {
                icon: <ClipboardList />,
                title: "List your services",
                body: "Set your hourly rate, city and area. Pause listings any time.",
              },
              {
                icon: <Wallet />,
                title: "Accept jobs, get paid",
                body: "Accept requests that fit your schedule and build your reputation.",
              },
            ]}
          />
        </div>
      </section>

      {topRated.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading
            title="Top-rated professionals"
            subtitle="Highly reviewed by clients like you"
            href="/services?sort=rating"
            linkLabel="See more"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topRated.items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/30 blur-3xl"
          />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Are you a skilled professional?
              </h2>
              <p className="max-w-xl opacity-85">
                Join Dastaras to reach clients in your city, set your own rates and manage every job
                from one dashboard.
              </p>
            </div>
            <Link
              href="/sign-up?role=provider"
              className={buttonClass({ variant: "accent", size: "lg" })}
            >
              Become a provider <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
      >
        {linkLabel} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function HowItWorks({
  title,
  steps,
}: {
  title: string;
  steps: { icon: React.ReactNode; title: string; body: string }[];
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <ol className="mt-6 grid gap-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border [&_svg]:size-5">
              {s.icon}
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {i + 1}
              </span>
            </span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
