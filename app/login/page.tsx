"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2, Clock } from "lucide-react";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by the middleware when a session is ended for inactivity, so we can
  // explain why they're back here instead of just showing a bare form.
  const timedOut = searchParams.get("timeout") === "1";
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Safe no-op if the row already exists - covers accounts created
    // through the old site before this row-creation step existed here.
    await fetch("/api/users/ensure", { method: "POST" });

    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[380px] p-6">
        <Link href="/" className="mb-5 flex items-center justify-center gap-1">
          <Image src="/logo-icon.png" alt="5" width={26} height={26} priority />
          <span className="text-[16px] font-semibold tracking-tight text-foreground">
            number
          </span>
        </Link>
        {timedOut && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2.5">
            <Clock size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              You were signed out after 4 hours of inactivity. Log in to pick up where you left
              off.
            </p>
          </div>
        )}

        <div className="mb-6 text-center">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Log in to see your balance and buy numbers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Log in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary-700 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

/**
 * useSearchParams() must sit inside a Suspense boundary in the Next.js App
 * Router - without one, `next build` fails when prerendering this route.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
