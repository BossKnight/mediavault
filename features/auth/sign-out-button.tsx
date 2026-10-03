"use client";

import { Button } from "@/components/ui/button";
import { loadAuthClient, preloadAuthClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="shrink-0 whitespace-nowrap"
      onPointerEnter={preloadAuthClient}
      onFocus={preloadAuthClient}
      onClick={async () => {
        const { signOut } = await loadAuthClient();
        await signOut({ callbackUrl: "/login" });
      }}
    >
      Sign out
    </Button>
  );
}
