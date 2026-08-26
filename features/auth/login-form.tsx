"use client";

import { useId, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = "Enter your email.";
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Enter your password.";
  }
  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailErrorId = useId();
  const passwordErrorId = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect email or password.");
      setSubmitting(false);
      return;
    }

    router.push("/catalog");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-surface-foreground">Email</span>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? emailErrorId : undefined}
        />
        {fieldErrors.email && (
          <p id={emailErrorId} role="alert" className="text-xs text-danger">
            {fieldErrors.email}
          </p>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-surface-foreground">Password</span>
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) {
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
        />
        {fieldErrors.password && (
          <p id={passwordErrorId} role="alert" className="text-xs text-danger">
            {fieldErrors.password}
          </p>
        )}
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
