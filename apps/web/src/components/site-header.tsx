import Link from "next/link";
import { getSessionUser } from "@/lib/server";
import { Logo } from "./logo";
import { buttonClass } from "./ui/button";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link href="/services" className={buttonClass({ variant: "ghost", size: "sm" })}>
            Browse services
          </Link>
          {user?.role !== "provider" && (
            <Link
              href={user ? "/dashboard" : "/sign-up?role=provider"}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Become a provider
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/services"
            className={buttonClass({ variant: "ghost", size: "sm", className: "md:hidden" })}
          >
            Browse
          </Link>
          {user ? (
            <UserMenu name={user.name} email={user.email} image={user.image} role={user.role} />
          ) : (
            <>
              <Link href="/sign-in" className={buttonClass({ variant: "ghost", size: "sm" })}>
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonClass({ size: "sm" })}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
