"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { CountryFlag } from "@/components/dashboard/country-flag";
import { SmspvaServiceIcon } from "@/components/dashboard/smspva-service-icon";
import { SearchableSelect } from "@/components/dashboard/searchable-select";
import { RentOrderCard } from "@/components/dashboard/rent-order-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SMSPVA_RENT_COUNTRIES } from "@/lib/smspva-rent-countries";
import { SmspvaCountry } from "@/lib/types";
import { adaptRentOrder, ApiRentOrder, RentOrder } from "@/lib/rent-adapters";
import { cn } from "@/lib/utils";

/** Shape returned by /api/rent/pricing - built from SMSPVA's own catalog. */
interface RentService {
  id: string;
  code: string;
  name: string;
  logoUrl: string;
  hasCustomLogo: boolean;
  pricePerDay: number;
  totalCount: number;
}

type Dtype = "week" | "month";

const DURATIONS: [Dtype, number, string][] = [
  ["week", 1, "1 week"],
  ["week", 2, "2 weeks"],
  ["month", 1, "1 month"],
  ["month", 3, "3 months"],
];

export default function RentPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [authError, setAuthError] = useState(false);

  const [activeCountry, setActiveCountry] = useState<SmspvaCountry | null>(
    SMSPVA_RENT_COUNTRIES.find((c) => c.code === "AR") ?? SMSPVA_RENT_COUNTRIES[0] ?? null
  );
  const [dtype, setDtype] = useState<Dtype>("week");
  const [dcount, setDcount] = useState(1);
  const [query, setQuery] = useState("");

  const [services, setServices] = useState<RentService[]>([]);
  const [loading, setLoading] = useState(false);

  const [buyingCode, setBuyingCode] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const [orders, setOrders] = useState<RentOrder[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const days = dcount * (dtype === "week" ? 7 : 30);

  // --- Load wallet balance + existing active rentals on mount ------------
  useEffect(() => {
    async function loadInitial() {
      try {
        const meRes = await fetch("/api/me");
        if (meRes.status === 401) {
          setAuthError(true);
          return;
        }
        if (meRes.ok) {
          const me = await meRes.json();
          setBalance(me.walletBalance);
        }

        const ordersRes = await fetch("/api/rent/orders");
        if (ordersRes.ok) {
          const { orders: apiOrders } = (await ordersRes.json()) as { orders: ApiRentOrder[] };
          setOrders(apiOrders.map(adaptRentOrder));
        }
      } catch (err) {
        console.error("Failed to load initial rent state:", err);
      }
    }
    loadInitial();
  }, []);

  // --- Fetch live pricing whenever country/duration changes --------------
  useEffect(() => {
    if (!activeCountry) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/rent/pricing?country=${activeCountry.code}&dtype=${dtype}&dcount=${dcount}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setServices(data.services ?? []);
      })
      .catch((err) => console.error("Failed to load rent pricing:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCountry, dtype, dcount]);

  const filtered = useMemo(() => {
    if (!query.trim()) return services;
    const q = query.trim().toLowerCase();
    return services.filter((s) => (s.name ?? "").toLowerCase().includes(q));
  }, [services, query]);

  async function rentService(service: RentService) {
    if (!activeCountry) return;
    setBuyingCode(service.code);
    setPurchaseError(null);
    try {
      const res = await fetch("/api/rent/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.code,
          countryCode: activeCountry.code,
          dtype,
          dcount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPurchaseError(data.error ?? "Purchase failed.");
        return;
      }
      setOrders((prev) => [adaptRentOrder(data.order), ...prev]);
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setBalance(me.walletBalance);
      }
    } catch (err) {
      console.error("Rental purchase failed:", err);
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setBuyingCode(null);
    }
  }

  async function refreshOrder(id: string) {
    setBusyOrderId(id);
    try {
      const res = await fetch(`/api/rent/orders/${id}`);
      if (res.ok) {
        const { order } = (await res.json()) as { order: ApiRentOrder };
        setOrders((prev) => prev.map((o) => (o.id === id ? adaptRentOrder(order) : o)));
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function prolongOrder(id: string, t: Dtype, c: number) {
    setBusyOrderId(id);
    try {
      const res = await fetch(`/api/rent/orders/${id}/prolong`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dtype: t, dcount: c }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === id ? adaptRentOrder(data.order) : o)));
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const me = await meRes.json();
          setBalance(me.walletBalance);
        }
      }
    } catch (err) {
      console.error("Prolong failed:", err);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function cancelOrder(id: string) {
    setBusyOrderId(id);
    try {
      await fetch(`/api/rent/orders/${id}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setBusyOrderId(null);
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

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">Rent a number</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Keep one number for days or weeks - receive SMS from any service on it, not just one.
          </p>
        </div>

        {purchaseError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            {purchaseError}
          </div>
        )}

        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-white p-4 shadow-card">
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-foreground">Country</p>
            <SearchableSelect
              items={SMSPVA_RENT_COUNTRIES}
              selected={activeCountry}
              onSelect={(c) => c && setActiveCountry(c)}
              getKey={(c) => c.code}
              getLabel={(c) => c.name}
              renderIcon={(c) => <CountryFlag isoCode={c.isoCode} size={18} />}
              allLabel={`All countries (${SMSPVA_RENT_COUNTRIES.length})`}
              placeholder="Search country…"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-foreground">Rental period</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {DURATIONS.map(([t, c, label]) => (
                <button
                  key={label}
                  onClick={() => {
                    setDtype(t);
                    setDcount(c);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    dtype === t && dcount === c
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-border bg-white text-foreground hover:bg-muted/60"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-[200px] flex-1">
            <p className="mb-1.5 text-[12.5px] font-medium text-foreground">Search service</p>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Telegram"
                className="pl-8"
              />
            </div>
          </div>

          <div className="ml-auto text-right">
            <p className="text-[12px] text-muted-foreground">Balance</p>
            <p className="text-[15px] font-semibold text-foreground">
              ${(balance ?? 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          {/* Service grid */}
          <div>
            {loading ? (
              <div className="rounded-lg border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
                Loading services…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
                {services.length === 0
                  ? "No rental services available for this country/period."
                  : "No services match your search."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((s) => {
                  const total = (Number(s.pricePerDay) || 0) * days;
                  const busy = buyingCode === s.code;
                  return (
                    <div
                      key={s.code}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-white p-3 shadow-card transition-colors hover:bg-muted/40"
                    >
                      <SmspvaServiceIcon
                        service={{
                          id: s.id,
                          code: s.code,
                          name: s.name,
                          logoUrl: s.logoUrl,
                          hasCustomLogo: s.hasCustomLogo,
                        }}
                        size={34}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{s.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {s.totalCount ?? 0} avail. · ${(Number(s.pricePerDay) || 0).toFixed(2)}/day
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => rentService(s)}
                        disabled={busy || buyingCode !== null}
                        className="shrink-0"
                      >
                        {busy ? "…" : `$${(Number(total) || 0).toFixed(2)}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active rentals */}
          <div className="space-y-3 lg:sticky lg:top-[76px] lg:self-start">
            <p className="text-[13px] font-semibold text-foreground">
              Active rentals ({orders.length})
            </p>
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-[13px] text-muted-foreground">
                No active rentals yet.
              </div>
            ) : (
              orders.map((order) => (
                <RentOrderCard
                  key={order.id}
                  order={order}
                  service={(() => {
                    const svc = services.find((s) => s.code === order.serviceId);
                    return svc
                      ? {
                          id: order.serviceId,
                          code: order.serviceId,
                          name: svc.name,
                          logoUrl: svc.logoUrl,
                          hasCustomLogo: svc.hasCustomLogo,
                        }
                      : {
                          id: order.serviceId,
                          code: order.serviceId,
                          name: order.serviceId,
                          logoUrl: "",
                          hasCustomLogo: false,
                        };
                  })()}
                  country={
                    SMSPVA_RENT_COUNTRIES.find((c) => c.code === order.countryCode) ?? null
                  }
                  onRefresh={() => refreshOrder(order.id)}
                  onProlong={(t, c) => prolongOrder(order.id, t, c)}
                  onCancel={() => cancelOrder(order.id)}
                  busy={busyOrderId === order.id}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
