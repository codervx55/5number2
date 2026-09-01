"use client";

import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, Loader2, Wallet } from "lucide-react";

type Txn = {
  id: string; type: string; method: string; label: string; amount: number; createdAt: string;
};
type Totals = { deposited: number; spent: number; refunded: number };

function money(n: number) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${Math.abs(v).toFixed(2)}` : "$0.00";
}
function when(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

const typeMeta: Record<string, { label: string; Icon: any; className: string; sign: string }> = {
  topup: { label: "Deposit", Icon: ArrowDownCircle, className: "text-emerald-600", sign: "+" },
  purchase: { label: "Purchase", Icon: ArrowUpCircle, className: "text-destructive", sign: "-" },
  refund: { label: "Refund", Icon: RotateCcw, className: "text-sky-600", sign: "+" },
};

export default function WalletPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, meRes] = await Promise.all([
          fetch("/api/me/transactions"),
          fetch("/api/me"),
        ]);
        if (tRes.ok) {
          const d = await tRes.json();
          setTxns(Array.isArray(d?.transactions) ? d.transactions : []);
          setTotals(d?.totals ?? null);
        }
        if (meRes.ok) {
          const me = await meRes.json();
          setBalance(Number(me.walletBalance));
        }
      } catch (e) {
        console.error("Failed to load wallet:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-foreground">Wallet</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Your balance, deposits, and spending history.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-card">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Wallet size={12} /> Balance
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {balance !== null ? money(balance) : "—"}
                </p>
              </div>
              <Stat label="Total deposited" value={money(totals?.deposited ?? 0)} className="text-emerald-600" />
              <Stat label="Total spent" value={money(totals?.spent ?? 0)} className="text-destructive" />
              <Stat label="Total refunded" value={money(totals?.refunded ?? 0)} className="text-sky-600" />
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
              {txns.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </p>
              ) : (
                txns.map((t) => {
                  const m = typeMeta[t.type] ?? { label: t.type, Icon: Wallet, className: "text-foreground", sign: "" };
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <m.Icon size={18} className={m.className} />
                        <div>
                          <p className="text-[13.5px] font-medium text-foreground">{m.label}</p>
                          <p className="text-[11.5px] text-muted-foreground">{t.label}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[13.5px] font-semibold ${m.className}`}>
                          {m.sign}{money(t.amount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{when(t.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
