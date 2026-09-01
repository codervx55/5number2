"use client";

import { motion } from "framer-motion";
import { Coins, ShieldCheck, Boxes, Loader2 } from "lucide-react";
import { CountryFlag } from "./country-flag";
import { SmspvaServiceIcon } from "./smspva-service-icon";
import { Button } from "@/components/ui/button";
import { Listing, SmspvaCountry, SmspvaService } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListingCard({
  listing,
  country,
  service,
  onBuy,
  isPurchasing,
  disabled,
}: {
  listing: Listing;
  country: SmspvaCountry;
  service: SmspvaService;
  onBuy: () => void;
  isPurchasing?: boolean;
  disabled?: boolean;
}) {
  const lowStock = listing.stock < 15;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -1 }}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-white px-3.5 py-3 shadow-card transition-shadow hover:shadow-card-hover sm:gap-4 sm:px-4"
      )}
    >
      {/* Country */}
      <div className="flex min-w-[92px] items-center gap-2 sm:min-w-[130px]">
        <CountryFlag isoCode={country.isoCode} size={22} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">{country.name}</p>
          <p className="text-[11.5px] text-muted-foreground">{country.dialCode}</p>
        </div>
      </div>

      <div className="h-8 w-px shrink-0 bg-border" />

      {/* Service */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <SmspvaServiceIcon service={service} size={30} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">
            {service.name}
            <span
              className={cn(
                "ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                listing.provider === "5sim"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-sky-50 text-sky-700"
              )}
            >
              {listing.provider === "5sim" ? "Provider 2" : "Provider 1"}
            </span>
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            +•• ••• •••• &middot; hidden until purchase
          </p>
          <div className="mt-0.5 flex items-center gap-2.5 lg:hidden">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck size={11} className="text-primary-600" />
              {listing.successRate}%
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Boxes size={11} className={lowStock ? "text-amber-500" : ""} />
              {listing.stock} left
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden shrink-0 items-center gap-4 lg:flex">
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary-600" />
          <span className="font-medium text-foreground">{listing.successRate}%</span>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Boxes size={13} className={lowStock ? "text-amber-500" : "text-muted-foreground"} />
          <span className={cn("font-medium", lowStock ? "text-amber-600" : "text-foreground")}>
            {listing.stock}
          </span>
        </div>
      </div>

      {/* Price + Buy */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1 text-[13.5px] font-semibold text-foreground">
          <Coins size={13} className="text-primary-600" />
          {listing.priceInPoints}
        </div>
        <motion.div whileHover={{ scale: disabled ? 1 : 1.04 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="sm"
            onClick={onBuy}
            disabled={disabled || isPurchasing}
            className="min-w-[68px] shadow-xs hover:shadow-card-hover"
          >
            {isPurchasing ? <Loader2 size={14} className="animate-spin" /> : "Buy"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
