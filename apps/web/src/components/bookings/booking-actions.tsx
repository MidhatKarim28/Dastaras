"use client";

import type { BookingStatus } from "@dastaras/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { api, unwrap } from "@/lib/api";

type Action = { to: BookingStatus; label: string };

const DESTRUCTIVE: readonly BookingStatus[] = ["cancelled", "declined"];

const SUCCESS: Partial<Record<BookingStatus, string>> = {
  accepted: "Booking accepted",
  declined: "Booking declined",
  cancelled: "Booking cancelled",
  in_progress: "Job started",
  completed: "Job marked complete",
};

/**
 * Renders one button per allowed transition. The API decides what's allowed
 * (`actions`), so this component never encodes the booking rules itself.
 */
export function BookingActions({
  bookingId,
  actions,
  size = "sm",
}: {
  bookingId: string;
  actions: readonly Action[];
  size?: ButtonSize;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [note, setNote] = useState("");

  const transition = useMutation({
    mutationFn: async (vars: { to: BookingStatus; note?: string }) =>
      unwrap(
        await api().api.bookings[":id"].transition.$post({
          param: { id: bookingId },
          json: vars,
        }),
      ),
    onSuccess: (_data, vars) => {
      toast.success(SUCCESS[vars.to] ?? "Booking updated");
      setConfirming(null);
      setNote("");
    },
    onSettled: async () => {
      // Refresh dashboards, stats and the detail view even when the transition lost a race (409).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      router.refresh();
    },
  });

  if (actions.length === 0) return null;

  // Primary actions first, cancel/decline last.
  const ordered = [...actions].sort(
    (a, b) => Number(DESTRUCTIVE.includes(a.to)) - Number(DESTRUCTIVE.includes(b.to)),
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ordered.map((action) => {
          const destructive = DESTRUCTIVE.includes(action.to);
          const variant: ButtonVariant = destructive ? "outline" : "primary";
          return (
            <Button
              key={action.to}
              size={size}
              variant={variant}
              className={destructive ? "text-destructive" : undefined}
              loading={transition.isPending && transition.variables?.to === action.to}
              disabled={transition.isPending}
              onClick={() =>
                destructive ? setConfirming(action) : transition.mutate({ to: action.to })
              }
            >
              {action.label}
            </Button>
          );
        })}
      </div>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming?.to === "declined" ? "Decline this request?" : "Cancel this booking?"}
        description="This can't be undone. The other party will see your note."
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (confirming)
              transition.mutate({ to: confirming.to, note: note.trim() || undefined });
          }}
        >
          <Field label="Note (optional)" htmlFor={`note-${bookingId}`}>
            <Textarea
              id={`note-${bookingId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder={
                confirming?.to === "declined"
                  ? "e.g. Fully booked that day, sorry!"
                  : "e.g. Plans changed"
              }
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Keep it
            </Button>
            <Button type="submit" variant="destructive" loading={transition.isPending}>
              {confirming?.label}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
