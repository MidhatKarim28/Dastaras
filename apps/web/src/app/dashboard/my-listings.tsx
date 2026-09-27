"use client";

import { formatPKR } from "@dastaras/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, Pause, Pencil, Play, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, EmptyState, Rating } from "@/components/ui/misc";
import { api, unwrap } from "@/lib/api";
import { CategoryIcon } from "@/lib/icons";
import type { MyListing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ListSkeleton } from "./bookings-list";
import { ListingForm } from "./listing-form";

export function MyListings() {
  const [editing, setEditing] = useState<MyListing | "new" | null>(null);
  const listings = useQuery({
    queryKey: ["me", "listings"],
    queryFn: async () => unwrap(await api().api.me.listings.$get()),
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Each listing is one service you offer, with its own rate and area.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New listing
        </Button>
      </div>

      {listings.isPending ? (
        <ListSkeleton rows={2} />
      ) : listings.isError ? (
        <p className="text-sm text-destructive">{listings.error.message}</p>
      ) : listings.data.length === 0 ? (
        <EmptyState icon={<Store />} title="You haven't listed any services yet">
          Create your first listing so clients can find and book you.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {listings.data.map((l) => (
            <ListingRow key={l.id} listing={l} onEdit={() => setEditing(l)} />
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New listing" : "Edit listing"}
        className="max-w-2xl"
      >
        {editing !== null && (
          <ListingForm
            listing={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ListingRow({ listing, onEdit }: { listing: MyListing; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: async () =>
      unwrap(
        await api().api.listings[":id"].$patch({
          param: { id: listing.id },
          json: { active: !listing.active },
        }),
      ),
    onSuccess: (updated) => {
      toast.success(updated.active ? "Listing is live again" : "Listing paused");
      return queryClient.invalidateQueries({ queryKey: ["me", "listings"] });
    },
  });

  return (
    <li className={cn("grid gap-3 rounded-xl border bg-card p-4", !listing.active && "opacity-75")}>
      <div className="flex items-start justify-between gap-2">
        <Badge tone="primary">
          <CategoryIcon name={listing.category.icon} />
          {listing.service.name}
        </Badge>
        {listing.active ? <Badge tone="primary">Live</Badge> : <Badge tone="accent">Paused</Badge>}
      </div>
      <div>
        <p className="font-medium leading-snug">{listing.title}</p>
        <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{formatPKR(listing.hourlyRate)}/hr</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {listing.area}, {listing.city}
          </span>
          <Rating value={listing.ratingAvg} count={listing.ratingCount} />
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggle.mutate()}
          loading={toggle.isPending}
        >
          {listing.active ? (
            <>
              <Pause /> Pause
            </>
          ) : (
            <>
              <Play /> Resume
            </>
          )}
        </Button>
        <Link
          href={`/listings/${listing.id}`}
          className="ml-auto flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </li>
  );
}
