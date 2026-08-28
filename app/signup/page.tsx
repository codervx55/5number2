"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";

type Step = "details" | "code";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code.");
        return;
      }
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid code.");
        return;
      }

      // Account now exists and is verified - sign in to get a session.
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 3000);
      }
    } catch {
      // Silently ignore - not critical enough to interrupt the user.
    }
  }

  if (step === "code") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-[380px] p-6">
          <button
            onClick={() => setStep("details")}
            className="mb-4 flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="mb-6 text-center">
            <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <div>
              <label htmlFor="code" className="mb-1.5 block text-[12.5px] font-medium text-foreground">
                Verification code
              </label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="text-center text-[18px] tracking-[0.3em]"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify and create account"}
            </Button>
          </form>

          <button
            onClick={handleResend}
            className="mt-4 w-full text-center text-[12.5px] text-primary-700 hover:underline"
          >
            {resent ? "Code resent!" : "Didn't get a code? Resend"}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[380px] p-6">
        <div className="mb-6 text-center">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Get started buying virtual numbers.
          </p>
        </div>

        <form onSubmit={handleDetailsSubmit} className="space-y-3">
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-[12.5px] font-medium text-foreground"
            >
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Continue"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-700 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
