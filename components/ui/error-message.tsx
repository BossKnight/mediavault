"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SESSION_EXPIRED_MESSAGE, signInAgainHref } from "@/lib/session-expired";

interface ErrorMessageProps {
  message: string;
  className?: string;
  // Extra controls after the message, e.g. a "Try again" button.
  children?: ReactNode;
}

/**
 * An error announced as an alert. A session-expired error links to sign-in
 * (returning to this page); retrying wouldn't help, so `children` (a retry
 * button, say) is left out for it.
 */
export function ErrorMessage({ message, className, children }: ErrorMessageProps) {
  const sessionExpired = message === SESSION_EXPIRED_MESSAGE;
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <p role="alert" className="text-sm text-danger">
        {message}
      </p>
      {sessionExpired ? <SignInAgainLink /> : children}
    </div>
  );
}

/** Goes to sign-in, then back to the page the user is on. */
export function SignInAgainLink() {
  return (
    <a
      href={signInAgainHref()}
      className="focus-ring rounded text-sm font-medium text-accent hover:text-accent-hover"
    >
      Sign in again
    </a>
  );
}
