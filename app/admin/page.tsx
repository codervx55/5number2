"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Totals = {
  users: number; walletBalance: number; orders: number; ordersToday: number;
  ordersWeek: number; received: number; successRate: number; provider1: number;
  provider2: number; revenue: number; topups: number; refunds: number; siteViews: number;
};
type UserRow = { email: string; walletBalance: number; createdAt: string; orderCount: number; txnCount: number };
type OrderRow = { email: string; platform: string; country: string; price: number; status: string; provider: string; orderType: string; createdAt: string };
type TxnRow = { email: string; type: string; label: string; amount: number; createdAt: string };

function money(n: number) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${Math.abs(v).toFixed(2)}` : "$0.00";
}
function when(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export default function AdminPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/admin/all");
      if (res.status === 403) { setForbidden(true); return; }
      if (res.ok) {
        const d = await res.json();
        setTotals(d.totals ?? null);
        setUsers(Array.isArray(d.users) ? d.users : []);
        setOrders(Array.isArray(d.orders) ? d.orders : []);
        setTxns(Array.isArray(d.transactions) ? d.transactions : []);
      }
    } catch (e) {
      console.error("admin load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Auto-refresh every 30s so the dashboard stays live.
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-lg border border-border bg-white px-6 py-8 text-center shadow-card">
          <p className="text-lg font-semibold text-foreground">Access denied</p>
          <p className="mt-1 text-sm text-muted-foreground">Administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live overview · auto-refreshes every 30s</p>
          </div>
          {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
        </div>

        {/* Stat cards */}
        {totals && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Total users" value={String(totals.users)} />
            <Stat label="Site views" value={String(totals.siteViews)} accent="text-indigo-600" />
            <Stat label="Wallet balances held" value={money(totals.walletBalance)} />
            <Stat label="Revenue (spend)" value={money(totals.revenue)} accent="text-emerald-600" />
            <Stat label="Total deposits" value={money(totals.topups)} accent="text-emerald-600" />
            <Stat label="Total refunds" value={money(totals.refunds)} accent="text-sky-600" />
            <Stat label="Orders (all)" value={String(totals.orders)} />
            <Stat label="Orders today" value={String(totals.ordersToday)} />
            <Stat label="Orders (7d)" value={String(totals.ordersWeek)} />
            <Stat label="Success rate" value={`${totals.successRate}%`} />
            <Stat label="Provider 1 orders" value={String(totals.provider1)} />
            <Stat label="Provider 2 orders" value={String(totals.provider2)} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title={`Recent orders (${orders.length})`}>
            <Table
              head={["Email", "Service", "Country", "Prov.", "Price", "Status", "When"]}
              rows={orders.map((o) => [
                o.email, o.platform, o.country, o.provider, money(o.price), o.status, when(o.createdAt),
              ])}
            />
          </Section>

          <Section title={`Transactions (${txns.length})`}>
            <Table
              head={["Email", "Type", "Label", "Amount", "When"]}
              rows={txns.map((t) => [
                t.email, t.type, t.label,
                (t.type === "purchase" ? "-" : "+") + money(t.amount),
                when(t.createdAt),
              ])}
            />
          </Section>
        </div>

        <div className="mt-6">
          <Section title={`Users (${users.length})`}>
            <Table
              head={["Email", "Balance", "Orders", "Txns", "Joined"]}
              rows={users.map((u) => [
                u.email, money(u.walletBalance), String(u.orderCount), String(u.txnCount), when(u.createdAt),
              ])}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-white shadow-card">
      <table className="w-full text-left text-[12.5px]">
        <thead className="sticky top-0 border-b border-border bg-muted/40">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={head.length} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-2 text-foreground">{c}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
