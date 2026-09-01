"use client";

import { useEffect, useState } from "react";
import { RefreshCw, MessageSquare, Clock, Phone } from "lucide-react";
import { adaptRentOrder, ApiRentOrder, RentOrder } from "@/lib/rent-adapters";
import { SMSPVA_RENT_COUNTRIES } from "@/lib/smspva-rent-countries";
import { CountryFlag } from "@/components/dashboard/country-flag";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return "Expired";
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hrs}h left`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m left`;
}

export default function MyRentalsPage() {
  const [orders, setOrders] = useState<RentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/rent/orders");
        if (res.ok) {
          const { orders: api } = (await res.json()) as { orders: ApiRentOrder[] };
          setOrders((api ?? []).map(adaptRentOrder));
        }
      } catch (e) {
        console.error("Failed to load rentals:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function checkSms(id: string) {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/rent/orders/${id}`);
      if (res.ok) {
        const { order } = (await res.json()) as { order: ApiRentOrder };
        setOrders((prev) => prev.map((o) => (o.id === id ? adaptRentOrder(order) : o)));
      }
    } catch (e) {
      console.error("Failed to check SMS:", e);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-foreground">My Rentals</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Your rented numbers. Check for new SMS anytime during the rental period.
        </p>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && orders.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            You have no active rentals. Rent a number from the Rent page.
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => {
            const country = SMSPVA_RENT_COUNTRIES.find((c) => c.code === order.countryCode);
            return (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {country && <CountryFlag isoCode={country.isoCode} size={20} />}
                    <div>
                      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                        <Phone size={13} className="text-primary-600" />
                        {order.phoneNumber}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {country?.name ?? order.countryCode} · {order.serviceId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Clock size={12} />
                      {timeLeft(order.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                      <MessageSquare size={12} />
                      Received SMS ({order.messages.length})
                    </p>
                    <button
                      onClick={() => checkSms(order.id)}
                      disabled={checkingId === order.id}
                      className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      <RefreshCw
                        size={12}
                        className={checkingId === order.id ? "animate-spin" : ""}
                      />
                      {checkingId === order.id ? "Checking…" : "Check for new SMS"}
                    </button>
                  </div>

                  {order.messages.length === 0 ? (
                    <p className="rounded-md bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                      No SMS yet. Use this number on a service, then tap “Check for new SMS”.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {order.messages.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-md border border-border bg-muted/20 px-3 py-2"
                        >
                          <p className="text-[11px] text-muted-foreground">{m.sender}</p>
                          <p className="text-[13px] text-foreground">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
