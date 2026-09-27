"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { api, unwrap } from "@/lib/api";
import { cn } from "@/lib/utils";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async (json: { rating: number; comment?: string }) =>
      unwrap(await api().api.bookings[":id"].review.$post({ param: { id: bookingId }, json })),
    onSuccess: async () => {
      toast.success("Thanks for your review!");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
      ]);
      router.refresh();
      onDone?.();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return toast.error("Pick a star rating first");
    submit.mutate({ rating, comment: comment.trim() || undefined });
  }

  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">How was the service?</legend>
        <div className="flex items-center gap-3">
          <div className="flex" onPointerLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onPointerEnter={() => setHover(i)}
                className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${i} star${i > 1 ? "s" : ""}`}
                aria-pressed={rating === i}
              >
                <Star
                  className={cn(
                    "size-8 transition-colors",
                    i <= shown ? "fill-accent text-accent" : "text-border",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{RATING_LABELS[shown]}</span>
        </div>
      </fieldset>
      <Field label="Comment (optional)" htmlFor={`comment-${bookingId}`}>
        <Textarea
          id={`comment-${bookingId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="What went well? Anything others should know?"
        />
      </Field>
      <Button type="submit" loading={submit.isPending} className="justify-self-end">
        Submit review
      </Button>
    </form>
  );
}

export function ReviewDialogButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
        <Star /> Leave a review
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Leave a review"
        description="Your review helps other clients choose with confidence."
      >
        <ReviewForm bookingId={bookingId} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
