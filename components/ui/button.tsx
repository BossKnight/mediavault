import { type ButtonHTMLAttributes, type MouseEvent, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";
/**
 * For buttons that run an action: `loading` swaps the label for a spinner
 * (shown only if it takes over 150 ms), `success` turns the button green and
 * draws a check, `error` gives it a short shake. Motion is in app/globals.css
 * (`.btn`).
 */
export type ButtonState = "idle" | "loading" | "success" | "error";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover disabled:bg-accent/40 disabled:text-accent-foreground/70",
  secondary:
    "bg-surface-raised text-surface-foreground border border-border hover:border-muted-foreground disabled:opacity-40",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-raised disabled:opacity-40",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/10 disabled:opacity-40",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  // Taller on touch layouts so small buttons still meet a ~40px tap target.
  sm: "h-10 px-3 text-sm sm:h-8",
  md: "h-10 px-4 text-sm",
};

/**
 * `disabled` is for actions that aren't available. For a busy button use
 * `state="loading"` (or `aria-disabled`): the button keeps keyboard focus,
 * so a screen reader doesn't lose its place mid-save, and clicks are
 * ignored until it's done.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", state, onClick, children, ...props }, ref) => {
    const busy = state === "loading" || state === "success";
    const blocked = busy || props["aria-disabled"] === true || props["aria-disabled"] === "true";

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
      if (blocked) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    }

    return (
      <button
        ref={ref}
        className={cn(
          // Label, spinner and check share one grid cell when the button has
          // a state, so its width never changes between them.
          "btn focus-ring items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-not-allowed",
          state ? "inline-grid justify-items-center" : "inline-flex",
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        data-state={state}
        aria-busy={state === "loading" || undefined}
        {...props}
        aria-disabled={blocked || undefined}
        onClick={handleClick}
      >
        {state ? (
          <>
            <span className="btn-label inline-flex items-center gap-2">{children}</span>
            <span className="btn-spinner" aria-hidden="true" />
            <svg className="btn-check h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" pathLength={1} />
            </svg>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
