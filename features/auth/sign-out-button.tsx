"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="shrink-0 whitespace-nowrap"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </Button>
  );
}
