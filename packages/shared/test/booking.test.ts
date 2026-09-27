import { describe, expect, it } from "vitest";
import {
  availableTransitions,
  BOOKING_STATUSES,
  BOOKING_TRANSITIONS,
  bookingTotal,
  canTransition,
  TERMINAL_STATUSES,
} from "../src/booking";

describe("booking state machine", () => {
  it("lets a provider accept or decline a pending booking", () => {
    expect(canTransition("pending", "accepted", "provider")).toBe(true);
    expect(canTransition("pending", "declined", "provider")).toBe(true);
  });

  it("does not let a client accept their own booking", () => {
    expect(canTransition("pending", "accepted", "client")).toBe(false);
  });

  it("does not allow skipping straight to completed", () => {
    expect(canTransition("pending", "completed", "provider")).toBe(false);
    expect(canTransition("accepted", "completed", "provider")).toBe(false);
  });

  it("has no way out of terminal states", () => {
    for (const s of TERMINAL_STATUSES) expect(BOOKING_TRANSITIONS[s]).toHaveLength(0);
  });

  it("only references known statuses", () => {
    for (const s of BOOKING_STATUSES)
      for (const t of BOOKING_TRANSITIONS[s]) expect(BOOKING_STATUSES).toContain(t.to);
  });

  it("filters transitions per actor", () => {
    expect(availableTransitions("accepted", "client").map((t) => t.to)).toEqual(["cancelled"]);
    expect(availableTransitions("accepted", "provider").map((t) => t.to)).toEqual([
      "in_progress",
      "cancelled",
    ]);
  });

  it("computes totals", () => {
    expect(bookingTotal(1500, 3)).toBe(4500);
  });
});
