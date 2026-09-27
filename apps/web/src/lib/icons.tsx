import {
  AirVent,
  Droplets,
  Hammer,
  HeartHandshake,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

// Explicit map (not `import { icons }`) so only the icons we use end up in the bundle.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  AirVent,
  Droplets,
  Hammer,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Zap,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
