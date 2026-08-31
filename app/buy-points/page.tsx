"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Check, CreditCard, Loader2, Smartphone } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Channel = "card" | "bank_transfer" | "ussd";

const CHANNELS: { id: Channel; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Card", hint: "Debit or credit card", icon: CreditCard },
  { id: "bank_transfer", label: "Bank transfer", hint: "Pay from your bank app", icon: Building2 },
  { id: "ussd", label: "USSD", hint: "Dial a code on your phone", icon: Smartphone },
];

const PRESETS = [5, 10, 20, 50];
const MIN_USD = 1;

function BuyPointsPageInner() {
  const searchParams = useSearchParams();
  const returnedRef = searchParams.get("ref");

  const [balance, setBalance] = useState<number | null>(null);
  const [authError, setAuthError] = useState(false);

  const [amount, setAmount] = useState("10");
  const [channel, setChannel] = useState<Channel>("card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when the user comes back from Paystack - we poll until the webhook
  // credits them, since the redirect can arrive before the payment settles.
  const [confirming, setConfirming] = useState(false);
  const [credited, setCredited] = useState<number | null>(null);

  const amountUsd = Number(amount);
  const valid = Number.isFinite(amountUsd) && amountUsd >= MIN_USD;

  async function loadBalance() {
    try {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      if (res.ok) {
        const me = await res.json();
        setBalance(me.walletBalance);
      }
    } catch (err) {
      console.error("Failed to load balance:", err);
    }
  }

  useEffect(() => {
    loadBalance();
  }, []);

  // --- Poll for confirmation after returning from Paystack ---------------
  useEffect(() => {
    if (!returnedRef) return;
    let cancelled = false;
    let attempts = 0;
    setConfirming(true);

    async function poll() {
      if (cancelled) return;
      attempts++;
      try {
        const res = await fetch(`/api/wallet/topup/status?ref=${returnedRef}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "credited") {
            setCredited(data.amount);
            setConfirming(false);
            loadBalance();
            return;
          }
        }
      } catch (err) {
        console.error("Status poll failed:", err);
      }

      // Give up after ~60s of polling. Bank transfers can take longer than
      // that, so we tell the user it'll land rather than claiming failure.
      if (attempts < 20 && !cancelled) {
        setTimeout(poll, 3000);
      } else if (!cancelled) {
        setConfirming(false);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [returnedRef]);

  async function startPayment() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/topup/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd, channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start payment.");
        return;
      }
      // Hand off to Paystack's hosted checkout.
      window.location.href = data.authorizationUrl;
    } catch (err) {
      console.error("Payment start failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-[15px] font-medium text-foreground">You need to sign in first.</p>
          <Link href="/login">
            <Button className="mt-4">Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header points={balance ?? 0} />

      <main className="mx-auto max-w-[560px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">Add funds</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Top up your wallet to buy and rent numbers.
          </p>
        </div>

        {credited !== null && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-primary-600/30 bg-primary-50 px-3 py-2.5 text-[13px] text-primary-700">
            <Check size={15} />
            ${credited.toFixed(2)} added to your wallet.
          </div>
        )}

        {confirming && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-[13px] text-muted-foreground">
            <Loader2 size={15} className="animate-spin" />
            Confirming your payment…
          </div>
        )}

        {returnedRef && !confirming && credited === null && (
          <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-[13px] text-muted-foreground">
            We haven&apos;t received confirmation yet. If you completed the payment, it will be
            added automatically once it clears — you can safely leave this page.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-border bg-white p-5 shadow-card">
          {/* Amount */}
          <p className="mb-2 text-[13px] font-semibold text-foreground">Amount</p>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  Number(amount) === p
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-border bg-white text-foreground hover:bg-muted/60"
                )}
              >
                ${p}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={MIN_USD}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
              placeholder="Enter amount"
            />
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Minimum ${MIN_USD.toFixed(2)}. You&apos;ll be charged the naira equivalent at
            today&apos;s rate.
          </p>

          {/* Payment method */}
          <p className="mb-2 mt-5 text-[13px] font-semibold text-foreground">Payment method</p>
          <div className="space-y-1.5">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const active = channel === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary-600 bg-primary-50"
                      : "border-border bg-white hover:bg-muted/60"
                  )}
                >
                  <Icon
                    size={17}
                    className={active ? "text-primary-600" : "text-muted-foreground"}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-medium",
                        active ? "text-primary-700" : "text-foreground"
                      )}
                    >
                      {c.label}
                    </p>
                    <p className="text-[12px] text-muted-foreground">{c.hint}</p>
                  </div>
                  {active && <Check size={15} className="shrink-0 text-primary-600" />}
                </button>
              );
            })}
          </div>

          <Button
            onClick={startPayment}
            disabled={!valid || submitting}
            className="mt-5 w-full"
            size="lg"
          >
            {submitting ? "Starting…" : `Pay $${valid ? amountUsd.toFixed(2) : "0.00"}`}
          </Button>
          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            Payments are processed securely by Paystack.
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * useSearchParams() must sit inside a Suspense boundary in the Next.js App
 * Router - without one, `next build` fails when prerendering this route.
 */
export default function BuyPointsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BuyPointsPageInner />
    </Suspense>
  );
}
