import { formatPKR } from "@dastaras/shared";
import { BadgeCheck, Briefcase, CalendarDays, ChevronRight, MapPin, Pause } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, Rating, Stars } from "@/components/ui/misc";
import { ApiError, unwrap } from "@/lib/api";
import { CategoryIcon } from "@/lib/icons";
import { getSessionUser, serverApi } from "@/lib/server";
import { formatDate } from "@/lib/utils";
import { BookingForm } from "./booking-form";

const getListing = cache(async (id: string) => {
  const client = await serverApi();
  try {
    return unwrap(await client.api.listings[":id"].$get({ param: { id } }));
  } catch (err) {
    // 400 = malformed id, 404 = missing or paused: both are "not found" to a visitor.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  return {
    title: listing.title,
    description: `${listing.service.name} by ${listing.provider.name} in ${listing.area}, ${listing.city}. ${formatPKR(listing.hourlyRate)}/hr.`,
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const [listing, user] = await Promise.all([getListing(id), getSessionUser()]);
  const profile = listing.providerProfile;
  const isOwner = user?.id === listing.provider.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link href="/services" className="hover:text-foreground">
          Services
        </Link>
        <ChevronRight className="size-4" />
        <Link
          href={`/services?category=${listing.category.slug}`}
          className="hover:text-foreground"
        >
          {listing.category.name}
        </Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-foreground">{listing.service.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-8">
          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                <CategoryIcon name={listing.category.icon} />
                {listing.service.name}
              </Badge>
              {!listing.active && (
                <Badge tone="accent">
                  <Pause /> Paused, only you can see this
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Rating value={listing.ratingAvg} count={listing.ratingCount} />
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {listing.area}, {listing.city}
              </span>
              <span className="font-medium text-foreground">
                {formatPKR(listing.hourlyRate)}/hr
              </span>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-lg font-semibold">About this service</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          </section>

          <Card className="grid gap-4 p-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={listing.provider.name}
                image={listing.provider.image}
                className="size-14 text-lg"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold">
                  {listing.provider.name}
                  {profile?.verified && (
                    <Badge tone="primary">
                      <BadgeCheck /> Verified
                    </Badge>
                  )}
                </p>
                {profile?.headline && (
                  <p className="text-sm text-muted-foreground">{profile.headline}</p>
                )}
              </div>
            </div>
            {profile && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="size-4" />
                  {profile.yearsExperience} {profile.yearsExperience === 1 ? "year" : "years"} of
                  experience
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> Based in {profile.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> Member since{" "}
                  {formatDate(profile.memberSince, { day: undefined })}
                </span>
              </div>
            )}
            {profile?.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}
          </Card>

          <section>
            <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
              Reviews
              <Rating value={listing.ratingAvg} count={listing.ratingCount} />
            </h2>
            {listing.reviews.length === 0 ? (
              <EmptyState title="No reviews yet">
                Be the first to book {listing.provider.name.split(" ")[0]} and share how it went.
              </EmptyState>
            ) : (
              <ul className="grid gap-3">
                {listing.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={r.reviewer.name}
                        image={r.reviewer.image}
                        className="size-8 text-xs"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.reviewer.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BookingForm
            listingId={listing.id}
            hourlyRate={listing.hourlyRate}
            providerFirstName={listing.provider.name.split(" ")[0] ?? listing.provider.name}
            viewer={isOwner ? "owner" : user ? "signed-in" : "anonymous"}
            active={listing.active}
          />
        </aside>
      </div>
    </div>
  );
}
