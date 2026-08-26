import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { LoginForm } from "@/features/auth/login-form";
import { Logo } from "@/components/ui/logo";

export default async function LoginPage() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/catalog");

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
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your MediaVault catalog.</p>

        <div className="mt-6">
          <LoginForm />
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
