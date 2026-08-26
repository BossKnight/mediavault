"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/wishlist", label: "Wishlist" },
];

/** Shared top bar for every signed-in page: logo, section nav, sign out. */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight text-foreground">MediaVault</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-muted text-accent-muted-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <SignOutButton />
    </div>
  );
}
