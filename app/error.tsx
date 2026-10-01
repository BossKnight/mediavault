"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Shown in place of a page whose server render or data fetch failed. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We couldn&rsquo;t load this page. It&rsquo;s usually temporary, so try again in a moment.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/catalog"
          className="focus-ring inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          Go to your catalog
        </Link>
      </div>
    </main>
  );
}
