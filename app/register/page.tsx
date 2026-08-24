import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { RegisterForm } from "@/features/auth/register-form";
import { Logo } from "@/components/ui/logo";

export default async function RegisterPage() {
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
        <h1 className="text-xl font-semibold text-surface-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start cataloging your collection.</p>

        <div className="mt-6">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="focus-ring rounded text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
