"use client";

import { Coins, ShieldCheck, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "./country-flag";
import { ServiceIcon } from "./service-icon";
import { Country, Listing, Service } from "@/lib/types";

export function BuyConfirmDialog({
  open,
  onOpenChange,
  listing,
  country,
  service,
  balance,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing | null;
  country: Country | null;
  service: Service | null;
  balance: number;
  onConfirm: () => void;
}) {
  if (!listing || !country || !service) return null;
  const insufficient = balance < listing.priceInPoints;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm purchase</DialogTitle>
          <DialogDescription>
            The real number is revealed only after payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
          <CountryFlag code={country.code} size={26} />
          <ServiceIcon service={service} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-foreground">{service.name}</p>
            <p className="text-[12px] text-muted-foreground">{country.name}</p>
          </div>
          <div className="flex items-center gap-1 rounded-sm bg-white border border-border px-2 py-1 font-mono text-[12.5px] text-muted-foreground">
            <Lock size={11} />
            +•• ••• ••••
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-md border border-border p-3 text-[12.5px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Success rate</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <ShieldCheck size={13} className="text-primary-600" />
              {listing.successRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Coins size={13} className="text-primary-600" />
              {listing.priceInPoints} points
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Balance after purchase</span>
            <span
              className={
                insufficient
                  ? "font-medium text-destructive"
                  : "font-medium text-foreground"
              }
            >
              {(balance - listing.priceInPoints).toLocaleString()} points
            </span>
          </div>
        </div>

        {insufficient ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-[12px] text-destructive">
            Not enough points. Top up your balance to complete this purchase.
          </div>
        ) : (
          <Button className="w-full" onClick={onConfirm}>
            Confirm &amp; reveal number
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
