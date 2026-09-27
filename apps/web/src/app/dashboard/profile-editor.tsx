"use client";

import { CITIES, type ProviderProfileInput, providerProfileSchema } from "@dastaras/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Skeleton } from "@/components/ui/misc";
import { ApiError, api, unwrap } from "@/lib/api";

type Errors = Partial<Record<keyof ProviderProfileInput, string>>;

export function ProfileEditor() {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Errors>({});
  const me = useQuery({
    queryKey: ["me", "profile"],
    queryFn: async () => unwrap(await api().api.me.$get()),
  });

  const save = useMutation({
    mutationFn: async (json: ProviderProfileInput) =>
      unwrap(await api().api.me["provider-profile"].$put({ json })),
    onSuccess: () => {
      toast.success("Profile saved");
      return queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues)
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
    },
  });

  if (me.isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (me.isError) return <p className="text-sm text-destructive">{me.error.message}</p>;

  const profile = me.data.providerProfile;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim() || undefined;
    const parsed = providerProfileSchema.safeParse({
      headline: text("headline") ?? "",
      bio: text("bio"),
      city: data.get("city"),
      yearsExperience: Number(data.get("yearsExperience") || 0),
      phone: text("phone")?.replace(/[\s-]/g, ""),
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof ProviderProfileInput] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  return (
    <Card className="max-w-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Public profile</h2>
          <p className="text-sm text-muted-foreground">Shown on every one of your listings.</p>
        </div>
        {profile?.verified && (
          <Badge tone="primary">
            <BadgeCheck /> Verified
          </Badge>
        )}
      </div>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field
          label="Headline"
          htmlFor="headline"
          error={errors.headline}
          hint="One line clients see under your name."
        >
          <Input
            id="headline"
            name="headline"
            defaultValue={profile?.headline}
            maxLength={80}
            placeholder="e.g. Certified electrician, 10 years in DHA & Gulberg"
            aria-invalid={!!errors.headline}
          />
        </Field>
        <Field label="About you" htmlFor="bio" error={errors.bio}>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile?.bio ?? ""}
            maxLength={1500}
            rows={5}
            placeholder="Your experience, certifications, and what clients can expect."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="city" error={errors.city}>
            <Select id="city" name="city" defaultValue={profile?.city ?? "Lahore"}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Years of experience"
            htmlFor="yearsExperience"
            error={errors.yearsExperience}
          >
            <Input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              defaultValue={profile?.yearsExperience ?? 0}
              aria-invalid={!!errors.yearsExperience}
            />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={me.data.phone ?? ""}
              placeholder="03001234567"
              aria-invalid={!!errors.phone}
            />
          </Field>
        </div>
        <Button type="submit" loading={save.isPending} className="justify-self-end">
          Save profile
        </Button>
      </form>
    </Card>
  );
}
