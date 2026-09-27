import { formatPKR } from "@dastaras/shared";
import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/lib/icons";
import type { ListingCard as ListingCardData } from "@/lib/types";
import { Avatar, Rating } from "./ui/misc";

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
          <CategoryIcon name={listing.category.icon} className="size-3.5" />
          {listing.service.name}
        </span>
        <Rating value={listing.ratingAvg} count={listing.ratingCount} />
      </div>
      <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
        {listing.title}
      </h3>
      <div className="mt-auto flex items-center gap-3">
        <Avatar name={listing.provider.name} image={listing.provider.image} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-medium">
            {listing.provider.name}
            {listing.provider.verified && (
              <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />
            )}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {listing.area}, {listing.city}
          </p>
        </div>
        <p className="text-right">
          <span className="font-semibold">{formatPKR(listing.hourlyRate)}</span>
          <span className="block text-xs text-muted-foreground">per hour</span>
        </p>
      </div>
    </Link>
  );
}
