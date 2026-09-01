"use client";

import { useEffect, useState } from "react";

type Overview = {
  users: number;
  totalWalletBalance: number;
  orders: { total: number; today: number; week: number; received: number; successRate: number };
  providerSplit: { provider1: number; provider2: number };
  money: { revenue: number; topups: number; refunds: number };
  siteViews: number;
};

type UserRow = {
  id: string; email: string; walletBalance: number; createdAt: string;
  orderCount: number; transactionCount: number;
};
type OrderRow = {
  id: string; email: string; platform: string; country: string; price: number;
  status: string; provider: string; phoneNumber: string; code: string | null;
  orderType: string; createdAt: string;
};
type TxnRow = {
  id: string; email: string; type: string; method: string; label: string;
  amount: number; createdAt: string;
};

const TABS = ["Overview", "Users", "Orders", "Transactions"] as const;
type Tab = (typeof TABS)[number];

function money(n: number) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
}
function date(s: string) {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/overview");
        if (res.status === 403) { setForbidden(true); return; }
        if (res.ok) {
          setOverview(await res.json());
        } else {
          setLoadError(`Overview failed: ${res.status}`);
        }
        const [u, o, t] = await Promise.all([
          fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
          fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : { orders: [] })),
          fetch("/api/admin/transactions").then((r) => (r.ok ? r.json() : { transactions: [] })),
        ]);
        setUsers(Array.isArray(u?.users) ? u.users : []);
        setOrders(Array.isArray(o?.orders) ? o.orders : []);
        setTxns(Array.isArray(t?.transactions) ? t.transactions : []);
      } catch (e: any) {
        setLoadError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-lg border border-border bg-white px-6 py-8 text-center shadow-card">
          <p className="text-lg font-semibold text-foreground">Access denied</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is for administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-xl font-bold text-foreground">Admin</h1>
        <p className="mb-4 text-sm text-muted-foreground">Activity, users, orders and revenue.</p>

        <div className="mb-5 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-3 py-2 text-sm font-medium " +
                (tab === t
                  ? "border-b-2 border-primary-600 text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loadError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            {loadError}
          </div>
        )}

        {!loading && tab === "Overview" && overview && overview.orders && overview.money && overview.providerSplit && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Total users" value={String(overview.users)} />
            <Stat label="Wallet balances held" value={money(overview.totalWalletBalance)} />
            <Stat label="Revenue (spend)" value={money(overview.money.revenue)} />
            <Stat label="Top-ups" value={money(overview.money.topups)} />
            <Stat label="Refunds" value={money(overview.money.refunds)} />
            <Stat label="Orders total" value={String(overview.orders.total)} />
            <Stat label="Orders today" value={String(overview.orders.today)} />
            <Stat label="Orders (7d)" value={String(overview.orders.week)} />
            <Stat label="Success rate" value={`${overview.orders.successRate}%`} />
            <Stat label="Provider 1 orders" value={String(overview.providerSplit.provider1)} />
            <Stat label="Provider 2 orders" value={String(overview.providerSplit.provider2)} />
            <Stat label="Site views" value={String(overview.siteViews)} />
          </div>
        )}

        {!loading && tab === "Users" && (
          <Table
            head={["Email", "Balance", "Orders", "Txns", "Joined"]}
            rows={users.map((u) => [
              u.email, money(u.walletBalance), String(u.orderCount),
              String(u.transactionCount), date(u.createdAt),
            ])}
          />
        )}

        {!loading && tab === "Orders" && (
          <Table
            head={["Email", "Service", "Country", "Provider", "Price", "Status", "When"]}
            rows={orders.map((o) => [
              o.email, o.platform, o.country, o.provider, money(o.price), o.status, date(o.createdAt),
            ])}
          />
        )}

        {!loading && tab === "Transactions" && (
          <Table
            head={["Email", "Type", "Label", "Amount", "When"]}
            rows={txns.map((t) => [
              t.email, t.type, t.label, money(t.amount), date(t.createdAt),
            ])}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-card">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-[12px] font-semibold text-muted-foreground">{h}</th>
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
                  <td key={j} className="px-3 py-2 text-foreground">{c}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
