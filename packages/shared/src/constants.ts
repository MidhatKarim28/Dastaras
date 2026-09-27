export const ROLES = ["client", "provider"] as const;
export type Role = (typeof ROLES)[number];

export const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
] as const;
export type City = (typeof CITIES)[number];

export const CURRENCY = "PKR";

/** Enforced by Better Auth on the API and checked live in the sign-up form. */
export const PASSWORD_MIN_LENGTH = 8;

export function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK")}`;
}
