"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/dashboard/header";
import { ServiceCountryPicker } from "@/components/dashboard/service-country-picker";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { ListingCard } from "@/components/dashboard/listing-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ActiveNumberPanel } from "@/components/dashboard/active-number-panel";
import { BuyConfirmDialog } from "@/components/dashboard/buy-confirm-dialog";
import { countries, services } from "@/lib/mock-data";
import { Listing, Order, SmspvaCountry, SmspvaService } from "@/lib/types";
import { adaptOrder, ApiOrder } from "@/lib/api-adapters";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 4000;

export default function DashboardPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [authError, setAuthError] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCountry, setActiveCountry] = useState<SmspvaCountry | null>(null);
  const [activeService, setActiveService] = useState<SmspvaService | null>(null);
  const [sort, setSort] = useState<"price" | "success" | "stock">("price");

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  const [pendingListing, setPendingListing] = useState<Listing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load wallet balance + restore any active order on mount -----------
  useEffect(() => {
    async function loadInitial() {
      try {
        const meRes = await fetch("/api/me");
        if (meRes.status === 401) {
          setAuthError(true);
          return;
        }
        const me = await meRes.json();
        setBalance(me.walletBalance);

        const ordersRes = await fetch("/api/orders");
        if (ordersRes.ok) {
          const { orders } = (await ordersRes.json()) as { orders: ApiOrder[] };
          if (orders.length > 0) {
            setActiveOrder(adaptOrder(orders[0]));
          }
        }
      } catch (err) {
        console.error("Failed to load initial state:", err);
      }
    }
    loadInitial();
  }, []);

  // --- Fetch live listings whenever the selected service changes ---------
  useEffect(() => {
    if (!activeService) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    fetch(`/api/listings?service=${encodeURIComponent(activeService.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setListings(data.listings ?? []);
      })
      .catch((err) => console.error("Failed to load listings:", err))
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeService]);

  // --- Poll for incoming SMS while an order is waiting --------------------
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!activeOrder || activeOrder.status !== "waiting") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${activeOrder.id}`);
        if (!res.ok) return;
        const { order } = (await res.json()) as { order: ApiOrder };
        setActiveOrder(adaptOrder(order));
      } catch (err) {
        console.error("Poll failed:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeOrder?.id, activeOrder?.status]);

  const filtered = useMemo(() => {
    if (!activeService) return [];
    let items = listings.filter((l) => l.stock > 0);
    if (activeCountry) items = items.filter((l) => l.countryCode === activeCountry.code);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((l) => {
        const country = countries.find((c) => c.code === l.countryCode);
        return country?.name.toLowerCase().includes(q);
      });
    }
    items = [...items].sort((a, b) => {
      if (sort === "price") return a.priceInPoints - b.priceInPoints;
      if (sort === "success") return b.successRate - a.successRate;
      return b.stock - a.stock;
    });
    return items.slice(0, 40);
  }, [listings, query, activeCountry, activeService, sort]);

  function openBuyDialog(listing: Listing) {
    setPurchaseError(null);
    setPendingListing(listing);
    setDialogOpen(true);
  }

  async function confirmPurchase() {
    if (!pendingListing) return;
    const listing = pendingListing;
    setDialogOpen(false);
    setPurchasingId(listing.id);
    setPurchaseError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: listing.serviceId,
          countryCode: listing.countryCode,
          provider: listing.provider ?? "smspva",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPurchaseError(data.error ?? "Purchase failed.");
        return;
      }

      setActiveOrder(adaptOrder(data.order as ApiOrder));
      // Re-sync balance from the server rather than guessing the deduction
      // client-side - it already applied the exact deducted amount.
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setBalance(me.walletBalance);
      }
    } catch (err) {
      // The POST can time out (e.g. a cold start) even though the server
      // actually created the order. Before showing an error, check whether an
      // order was in fact created - if so, recover silently and show it.
      console.error("Purchase request errored, checking if order was created:", err);
      try {
        await new Promise((r) => setTimeout(r, 1500));
        const ordersRes = await fetch("/api/orders");
        if (ordersRes.ok) {
          const { orders } = (await ordersRes.json()) as { orders: ApiOrder[] };
          if (orders.length > 0) {
            setActiveOrder(adaptOrder(orders[0]));
            const meRes = await fetch("/api/me");
            if (meRes.ok) {
              const me = await meRes.json();
              setBalance(me.walletBalance);
            }
            return; // recovered - no error shown
          }
        }
      } catch (recoverErr) {
        console.error("Recovery check failed:", recoverErr);
      }
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasingId(null);
      setPendingListing(null);
    }
  }

  async function releaseOrder() {
    if (!activeOrder) return;
    try {
      await fetch(`/api/orders/${activeOrder.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to release order:", err);
    }
    setActiveOrder(null);
  }

  async function refreshOrder() {
    if (!activeOrder) return;
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}`);
      if (!res.ok) return;
      const { order } = (await res.json()) as { order: ApiOrder };
      setActiveOrder(adaptOrder(order));
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  }

  const pendingCountry = pendingListing
    ? countries.find((c) => c.code === pendingListing.countryCode) ?? null
    : null;
  const pendingService = pendingListing
    ? services.find((s) => s.id === pendingListing.serviceId) ?? null
    : null;

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-[15px] font-medium text-foreground">You need to sign in first.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Log in to see your balance and buy numbers.
          </p>
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
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
            Get a number
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Choose a service, then a country. Numbers stay hidden until purchase.
          </p>
        </div>

        {purchaseError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            {purchaseError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* Listings column */}
          <div>
            <div className="mb-4">
              <ServiceCountryPicker
                services={services}
                countries={countries}
                listings={listings}
                activeService={activeService}
                onServiceChange={setActiveService}
                activeCountry={activeCountry}
                onCountryChange={setActiveCountry}
              />
            </div>

            {activeService && (
              <div className="mb-4">
                <FiltersBar
                  query={query}
                  onQueryChange={setQuery}
                  sort={sort}
                  onSortChange={setSort}
                />
              </div>
            )}

            {!activeService ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
                <ArrowRight size={18} />
                <p className="text-[13.5px]">Pick a service above to see available numbers.</p>
              </div>
            ) : listingsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
                <p className="text-[13.5px]">Checking live availability…</p>
              </div>
            ) : (
              <motion.div layout className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((listing) => {
                    const country = countries.find((c) => c.code === listing.countryCode)!;
                    const service = services.find((s) => s.id === listing.serviceId)!;
                    return (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        country={country}
                        service={service}
                        onBuy={() => openBuyDialog(listing)}
                        isPurchasing={purchasingId === listing.id}
                        disabled={purchasingId !== null}
                      />
                    );
                  })}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-14 text-center text-[13px] text-muted-foreground">
                    No numbers match your filters.
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Active number column */}
          <div className="lg:sticky lg:top-[76px] lg:self-start">
            <AnimatePresence mode="wait">
              {activeOrder ? (
                <ActiveNumberPanel
                  key={activeOrder.id}
                  order={activeOrder}
                  onRelease={releaseOrder}
                  onSimulateSms={refreshOrder}
                />
              ) : (
                <EmptyState key="empty" />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <BuyConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        listing={pendingListing}
        country={pendingCountry}
        service={pendingService}
        balance={balance ?? 0}
        onConfirm={confirmPurchase}
      />
    </div>
  );
}
