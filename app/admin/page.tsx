"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Users, Eye, Wallet, TrendingUp, ArrowDownToLine, RotateCcw,
  ShoppingBag, CheckCircle2, Layers,
} from "lucide-react";

type Totals = {
  users: number; walletBalance: number; orders: number; ordersToday: number;
  ordersWeek: number; received: number; successRate: number; provider1: number;
  provider2: number; revenue: number; topups: number; refunds: number;
  siteViews: number; ngnRate: number;
};
type UserRow = { email: string; walletBalance: number; createdAt: string; orderCount: number; txnCount: number };
type OrderRow = { email: string; platform: string; country: string; price: number; status: string; provider: string; orderType: string; createdAt: string };
type TxnRow = { email: string; type: string; label: string; amount: number; createdAt: string };

function usd(n: number) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${Math.abs(v).toFixed(2)}` : "$0.00";
}
function ngn(n: number, rate: number) {
  const v = Math.abs(Number(n)) * (Number(rate) || 0);
  return `₦${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur">
          <p className="text-lg font-semibold text-white">Access denied</p>
          <p className="mt-1 text-sm text-white/50">Administrators only.</p>
        </div>
      </div>
    );
  }

  const rate = totals?.ngnRate ?? 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-8">
      {/* floating gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <style>{`
        .blob { position:absolute; border-radius:9999px; filter:blur(80px); opacity:0.35; }
        .blob-1 { width:420px; height:420px; background:#6366f1; top:-120px; left:-80px; animation:float1 14s ease-in-out infinite; }
        .blob-2 { width:360px; height:360px; background:#10b981; top:40%; right:-100px; animation:float2 18s ease-in-out infinite; }
        .blob-3 { width:300px; height:300px; background:#0ea5e9; bottom:-120px; left:30%; animation:float3 16s ease-in-out infinite; }
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,40px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-30px)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }
        @keyframes rise { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
        .rise { animation:rise .5s ease both; }
      `}</style>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="rise">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-white/50">
              Live overview · auto-refreshes every 30s
              {rate > 0 && <span className="ml-2 text-white/30">· ₦{rate.toLocaleString()}/USD</span>}
            </p>
          </div>
          {loading && <Loader2 size={20} className="animate-spin text-white/40" />}
        </div>

        {totals && (
          <>
            {/* Hero earnings - USD + Naira */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <HeroCard
                icon={<TrendingUp size={20} />}
                label="Revenue (spend)"
                usd={usd(totals.revenue)}
                ngn={ngn(totals.revenue, rate)}
                gradient="from-emerald-500/20 to-emerald-500/5"
                ring="ring-emerald-400/30"
                delay={0}
              />
              <HeroCard
                icon={<ArrowDownToLine size={20} />}
                label="Total deposits"
                usd={usd(totals.topups)}
                ngn={ngn(totals.topups, rate)}
                gradient="from-indigo-500/20 to-indigo-500/5"
                ring="ring-indigo-400/30"
                delay={80}
              />
              <HeroCard
                icon={<Wallet size={20} />}
                label="Wallet balances held"
                usd={usd(totals.walletBalance)}
                ngn={ngn(totals.walletBalance, rate)}
                gradient="from-sky-500/20 to-sky-500/5"
                ring="ring-sky-400/30"
                delay={160}
              />
            </div>

            {/* Stat grid */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Stat icon={<Users size={15} />} label="Users" value={String(totals.users)} d={0} />
              <Stat icon={<Eye size={15} />} label="Site views" value={String(totals.siteViews)} d={40} />
              <Stat icon={<RotateCcw size={15} />} label="Refunds" value={usd(totals.refunds)} d={80} />
              <Stat icon={<ShoppingBag size={15} />} label="Orders (all)" value={String(totals.orders)} d={120} />
              <Stat icon={<ShoppingBag size={15} />} label="Orders today" value={String(totals.ordersToday)} d={160} />
              <Stat icon={<ShoppingBag size={15} />} label="Orders (7d)" value={String(totals.ordersWeek)} d={200} />
              <Stat icon={<CheckCircle2 size={15} />} label="Success rate" value={`${totals.successRate}%`} d={240} />
              <Stat icon={<Layers size={15} />} label="P1 / P2" value={`${totals.provider1} / ${totals.provider2}`} d={280} />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title={`Recent orders (${orders.length})`}>
            <Table
              head={["Email", "Service", "Country", "Prov.", "Price", "Status", "When"]}
              rows={orders.map((o) => [o.email, o.platform, o.country, o.provider, usd(o.price), o.status, when(o.createdAt)])}
            />
          </Panel>
          <Panel title={`Transactions (${txns.length})`}>
            <Table
              head={["Email", "Type", "Label", "Amount", "When"]}
              rows={txns.map((t) => [t.email, t.type, t.label, (t.type === "purchase" ? "-" : "+") + usd(t.amount), when(t.createdAt)])}
            />
          </Panel>
        </div>

        <div className="mt-6">
          <Panel title={`Users (${users.length})`}>
            <Table
              head={["Email", "Balance", "Orders", "Txns", "Joined"]}
              rows={users.map((u) => [u.email, usd(u.walletBalance), String(u.orderCount), String(u.txnCount), when(u.createdAt)])}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HeroCard({ icon, label, usd, ngn, gradient, ring, delay }: {
  icon: React.ReactNode; label: string; usd: string; ngn: string; gradient: string; ring: string; delay: number;
}) {
  return (
    <div
      className={`rise rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-5 ring-1 ${ring} backdrop-blur`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center gap-2 text-white/70">
        {icon}
        <span className="text-[12px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{usd}</p>
      <p className="mt-0.5 text-sm font-medium text-white/50">{ngn}</p>
    </div>
  );
}

function Stat({ icon, label, value, d }: { icon: React.ReactNode; label: string; value: string; d: number }) {
  return (
    <div className="rise rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur" style={{ animationDelay: `${d}ms` }}>
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/40">{icon}{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rise">
      <h2 className="mb-2 text-[13px] font-semibold text-white/70">{title}</h2>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur">
        {children}
      </div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left text-[12.5px]">
      <thead className="sticky top-0 border-b border-white/10 bg-white/5 backdrop-blur">
        <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold text-white/50">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className="px-3 py-6 text-center text-white/40">No data</td></tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">
              {r.map((c, j) => <td key={j} className="whitespace-nowrap px-3 py-2 text-white/80">{c}</td>)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
