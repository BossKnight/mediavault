import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { safeNextPath } from "@/lib/next-path";
import { LoginForm } from "@/features/auth/login-form";
import { Logo } from "@/components/ui/logo";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Where to land after signing in, e.g. back on the wishlist after a
  // session expired there.
  const { next } = await searchParams;
  const redirectTo = safeNextPath(Array.isArray(next) ? next[0] : next);

  const userId = await getCurrentUserId();
  if (userId) redirect(redirectTo);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight text-surface-foreground">
            MediaVault
          </span>
        </div>
        <h1 className="text-xl font-semibold text-surface-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your vault.</p>

        <div className="mt-6">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&rsquo;t have an account?{" "}
          <Link href="/register" className="focus-ring rounded text-accent hover:text-accent-hover">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
