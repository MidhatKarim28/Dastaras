"use client";

import { CITIES, type ListingInput, listingInputSchema } from "@dastaras/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ApiError, api, unwrap } from "@/lib/api";
import type { MyListing } from "@/lib/types";

type Errors = Partial<Record<keyof ListingInput, string>>;

/** Create or edit a listing. Validates with the same Zod schema the API uses. */
export function ListingForm({ listing, onDone }: { listing?: MyListing; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Errors>({});
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => unwrap(await api().api.categories.$get()),
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: async (json: ListingInput) =>
      listing
        ? unwrap(await api().api.listings[":id"].$patch({ param: { id: listing.id }, json }))
        : unwrap(await api().api.listings.$post({ json })),
    onSuccess: async () => {
      toast.success(listing ? "Listing updated" : "Listing published");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onDone();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues)
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = listingInputSchema.safeParse({
      serviceId: Number(data.get("serviceId")),
      title: data.get("title"),
      description: data.get("description"),
      hourlyRate: Number(data.get("hourlyRate")),
      city: data.get("city"),
      area: data.get("area"),
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ListingInput;
        next[key] ??= issue.path[0] === "serviceId" ? "Choose a service" : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Service" htmlFor="serviceId" error={errors.serviceId}>
        <Select
          id="serviceId"
          name="serviceId"
          defaultValue={listing?.service.id ?? ""}
          disabled={categories.isPending}
          aria-invalid={!!errors.serviceId}
        >
          <option value="" disabled>
            {categories.isPending ? "Loading…" : "Choose a service"}
          </option>
          {categories.data?.map((cat) => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="title" error={errors.title}>
        <Input
          id="title"
          name="title"
          defaultValue={listing?.title}
          placeholder="e.g. Split AC service & gas refill, same-day visits"
          maxLength={100}
          aria-invalid={!!errors.title}
        />
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        error={errors.description}
        hint="What's included, tools you bring, typical job length."
      >
        <DescriptionField defaultValue={listing ? undefined : ""} listingId={listing?.id} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hourly rate (Rs)" htmlFor="hourlyRate" error={errors.hourlyRate}>
          <Input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            inputMode="numeric"
            min={300}
            step={50}
            defaultValue={listing?.hourlyRate ?? 1000}
            aria-invalid={!!errors.hourlyRate}
          />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Select id="city" name="city" defaultValue={listing?.city ?? "Lahore"}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Area" htmlFor="area" error={errors.area}>
          <Input
            id="area"
            name="area"
            defaultValue={listing?.area}
            placeholder="e.g. Gulberg"
            maxLength={80}
            aria-invalid={!!errors.area}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {listing ? "Save changes" : "Publish listing"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The dashboard's listing rows don't carry the (long) description, so when
 * editing we load it from the public listing endpoint.
 */
function DescriptionField({
  listingId,
  defaultValue,
}: {
  listingId?: string;
  defaultValue?: string;
}) {
  const detail = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () =>
      unwrap(await api().api.listings[":id"].$get({ param: { id: listingId! } })),
    enabled: !!listingId,
  });

  if (listingId && detail.isPending)
    return <Textarea id="description" disabled placeholder="Loading…" rows={5} />;

  return (
    <Textarea
      key={detail.data?.id ?? "new"}
      id="description"
      name="description"
      rows={5}
      maxLength={2000}
      defaultValue={detail.data?.description ?? defaultValue}
      placeholder="Describe your experience and exactly what the client gets."
    />
  );
}
