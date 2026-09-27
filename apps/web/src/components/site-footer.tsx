import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Trusted home services, within reach. Book vetted local professionals across Pakistan by
            the hour.
          </p>
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="font-medium">For clients</p>
          <Link href="/services" className="text-muted-foreground hover:text-foreground">
            Browse services
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            My bookings
          </Link>
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="font-medium">For providers</p>
          <Link
            href="/sign-up?role=provider"
            className="text-muted-foreground hover:text-foreground"
          >
            Become a provider
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Provider dashboard
          </Link>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Dastaras. A portfolio project.
      </div>
    </footer>
  );
}
