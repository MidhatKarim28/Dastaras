"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./field";

export type PasswordRule = {
  /** What the user sees, e.g. "At least 8 characters". */
  label: string;
  test: (value: string) => boolean;
  /** Optional progress text while unmet, e.g. "3 more". */
  progress?: (value: string) => string;
};

/**
 * Password field with a show/hide toggle. Use it for every password input.
 * Pass `rules` (sign-up, change password) to show a live checklist as the user types.
 */
export function PasswordInput({
  className,
  rules,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { rules?: readonly PasswordRule[] }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const rulesId = props.id ? `${props.id}-rules` : undefined;
  const allMet = rules?.every((r) => r.test(value)) ?? true;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          aria-describedby={rules ? rulesId : undefined}
          aria-invalid={rules && value.length > 0 && !allMet ? true : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={props.id}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {rules && (
        <ul id={rulesId} className="grid gap-1 text-xs" aria-live="polite">
          {rules.map((rule) => {
            const met = rule.test(value);
            return (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  met ? "text-primary" : "text-muted-foreground",
                )}
              >
                {met ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <Circle className="size-3.5" aria-hidden />
                )}
                <span>
                  {rule.label}
                  {!met && value.length > 0 && rule.progress && ` (${rule.progress(value)})`}
                </span>
                <span className="sr-only">{met ? "met" : "not met yet"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
