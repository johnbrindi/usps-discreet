"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Please wait and try again." : "Incorrect email or password.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="danger" live>{error}</Alert>}
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
