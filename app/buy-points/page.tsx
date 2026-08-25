"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, CreditCard, Sparkles, ShieldCheck, Loader2, Check } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pointPackages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function BuyPointsPage() {
  const [points, setPoints] = useState(1240);
  const [selected, setSelected] = useState(pointPackages[2].id);
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(false);

  const pkg = pointPackages.find((p) => p.id === selected)!;

  function handlePurchase() {
    setPurchasing(true);
    setSuccess(false);
    setTimeout(() => {
      setPoints((p) => p + pkg.points + pkg.bonus);
      setPurchasing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2400);
    }, 1100);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header points={points} />

      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
        <div className="mb-7">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">Buy points</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Points are used to purchase numbers. They never expire.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pointPackages.map((p, i) => {
                const isSelected = selected === p.id;
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    whileHover={{ y: -2 }}
                    className={cn(
                      "relative flex flex-col rounded-lg border p-4 text-left shadow-card transition-all hover:shadow-card-hover",
                      isSelected
                        ? "border-primary-600 bg-primary-50/50 ring-1 ring-primary-600"
                        : "border-border bg-white"
                    )}
                  >
                    {p.highlight && (
                      <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-[10.5px] font-medium text-white">
                        <Sparkles size={10} />
                        Most popular
                      </span>
                    )}
                    <div className="mb-2 flex items-center gap-1.5">
                      <Coins size={16} className="text-primary-600" />
                      <span className="text-[17px] font-semibold text-foreground">
                        {p.points.toLocaleString()}
                      </span>
                      {p.bonus > 0 && (
                        <span className="rounded-sm bg-primary-50 px-1.5 py-0.5 text-[11px] font-medium text-primary-700">
                          +{p.bonus} bonus
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground">${p.price.toFixed(2)} USD</p>
                    <div
                      className={cn(
                        "mt-3 flex h-5 w-5 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary-600 bg-primary-600"
                          : "border-border bg-white"
                      )}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary-600" />
              Payments are processed securely. Points are added to your balance instantly after
              checkout and never expire.
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-[76px] lg:self-start">
            <Card className="p-4">
              <p className="mb-3 text-[13px] font-medium text-foreground">Order summary</p>

              <div className="space-y-2 border-b border-border pb-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium text-foreground">
                    {pkg.points.toLocaleString()} pts
                  </span>
                </div>
                {pkg.bonus > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bonus points</span>
                    <span className="font-medium text-primary-700">+{pkg.bonus} pts</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-foreground">${pkg.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-[13px] font-medium text-foreground">You&apos;ll receive</span>
                <span className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
                  <Coins size={14} className="text-primary-600" />
                  {(pkg.points + pkg.bonus).toLocaleString()}
                </span>
              </div>

              <Button className="w-full gap-1.5" onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Processing…
                  </>
                ) : success ? (
                  <>
                    <Check size={14} /> Added to balance
                  </>
                ) : (
                  <>
                    <CreditCard size={14} /> Pay ${pkg.price.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
                Current balance: {points.toLocaleString()} points
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
