import { BOOKING_STATUS_LABEL, type BookingStatus } from "@dastaras/shared";
import { Badge, type BadgeTone } from "@/components/ui/misc";

const TONE: Record<BookingStatus, BadgeTone> = {
  pending: "accent",
  accepted: "primary",
  in_progress: "primary",
  completed: "neutral",
  declined: "destructive",
  cancelled: "destructive",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge tone={TONE[status]}>
      {status === "in_progress" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {BOOKING_STATUS_LABEL[status]}
    </Badge>
  );
}
