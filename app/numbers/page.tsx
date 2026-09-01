"use client";

import { useEffect, useState } from "react";
import {
  Clock, CheckCircle2, XCircle, Loader2, Phone, Copy, Check, MessageSquare,
} from "lucide-react";
import { adaptOrder, ApiOrder } from "@/lib/api-adapters";
import { Order } from "@/lib/types";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { CountryFlag } from "@/components/dashboard/country-flag";

const statusMeta: Record<string, { label: string; className: string; Icon: any }> = {
  waiting: { label: "Waiting", className: "text-amber-700 bg-amber-50", Icon: Clock },
  received: { label: "Code received", className: "text-emerald-700 bg-emerald-50", Icon: CheckCircle2 },
  expired: { label: "Expired · refunded", className: "text-sky-700 bg-sky-50", Icon: XCircle },
  cancelled: { label: "Cancelled", className: "text-muted-foreground bg-muted", Icon: XCircle },
};

function svcName(id: string) {
  return SMSPVA_SERVICES.find((s) => s.id === id)?.name ?? id;
}
function ctry(code: string) {
  return SMSPVA_COUNTRIES.find((c) => c.code === code);
}
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MyNumbersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/orders?history=1");
      if (res.ok) {
        const { orders: api } = (await res.json()) as { orders: ApiOrder[] };
        setOrders((api ?? []).map(adaptOrder));
      }
    } catch (e) {
      console.error("Failed to load numbers:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      console.error("Cancel failed:", e);
    } finally {
      setBusyId(null);
    }
  }

  function copy(text: string, id: string) {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-foreground">My Numbers</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Your activation history. Cancel an unused number for a refund — once a code
          arrives, it can’t be refunded.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No numbers yet. Buy one from the Dashboard.
          </div>
        )}

        <div className="space-y-3">
          {orders.map((o) => {
            const country = ctry(o.listing.countryCode);
            const meta = statusMeta[o.status] ?? statusMeta.waiting;
            const hasCode = o.status === "received" || o.messages.some((m) => m.code);
            const canCancel = o.status === "waiting" && !hasCode;
            const code = o.messages.find((m) => m.code)?.code;

            return (
              <div key={o.id} className="rounded-lg border border-border bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {country && <CountryFlag isoCode={country.isoCode} size={22} />}
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">
                        {svcName(o.listing.serviceId)}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {country?.name ?? o.listing.countryCode} · {timeAgo(o.purchasedAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
                    <meta.Icon size={12} />
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <button
                    onClick={() => copy(o.phoneNumber, o.id)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-primary-700"
                    title="Copy number"
                  >
                    <Phone size={13} className="text-primary-600" />
                    {o.phoneNumber}
                    {copied === o.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-muted-foreground" />}
                  </button>
                  <span className="text-[13px] font-semibold text-foreground">
                    ${o.pricePaid.toFixed(2)}
                  </span>
                </div>

                {code && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
                    <MessageSquare size={13} className="text-emerald-600" />
                    <span className="text-[13px] font-semibold text-emerald-800">Code: {code}</span>
                  </div>
                )}

                {canCancel && (
                  <button
                    onClick={() => cancel(o.id)}
                    disabled={busyId === o.id}
                    className="mt-3 w-full rounded-md border border-destructive/30 bg-destructive/5 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {busyId === o.id ? "Cancelling…" : "Cancel & refund"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
