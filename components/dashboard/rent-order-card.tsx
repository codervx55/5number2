"use client";

import { useMemo, useState } from "react";
import { Clock, MessageSquare, RefreshCw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "./country-flag";
import { SmspvaServiceIcon } from "./smspva-service-icon";
import { RentOrder } from "@/lib/rent-adapters";
import { SmspvaCountry, SmspvaService } from "@/lib/types";

function timeLeft(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${hours}h ${mins}m left`;
}

export function RentOrderCard({
  order,
  service,
  country,
  onRefresh,
  onProlong,
  onCancel,
  busy,
}: {
  order: RentOrder;
  service: SmspvaService | null;
  country: SmspvaCountry | null;
  onRefresh: () => void;
  onProlong: (dtype: "week" | "month", dcount: number) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [showProlong, setShowProlong] = useState(false);
  const remaining = useMemo(() => timeLeft(order.expiresAt), [order.expiresAt]);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {service && <SmspvaServiceIcon service={service} size={32} />}
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              {service?.name ?? order.serviceId}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              {country && <CountryFlag isoCode={country.isoCode} size={14} />}
              <span>{country?.name ?? order.countryCode}</span>
            </div>
          </div>
        </div>
        <Badge variant={remaining === "Expired" ? "warning" : "success"} className="shrink-0">
          <Clock size={11} className="mr-1" />
          {remaining}
        </Badge>
      </div>

      <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
        <p className="font-mono text-[15px] font-semibold tracking-wide text-foreground">
          {order.phoneNumber}
        </p>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <MessageSquare size={13} />
          Messages ({order.messages.length})
        </div>
        {order.messages.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {order.messages.map((m) => (
              <div key={m.id} className="rounded-md border border-border/70 bg-white px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">{m.sender}</p>
                <p className="text-[12.5px] text-foreground">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {order.status === "active" && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={busy} className="gap-1">
            <RefreshCw size={13} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowProlong((v) => !v)} disabled={busy}>
            Extend
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="ml-auto gap-1 text-destructive hover:text-destructive"
          >
            <X size={13} />
            Cancel
          </Button>
        </div>
      )}

      {showProlong && (
        <div className="mt-2 flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => {
              onProlong("week", 1);
              setShowProlong(false);
            }}
            disabled={busy}
          >
            +1 week
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onProlong("month", 1);
              setShowProlong(false);
            }}
            disabled={busy}
          >
            +1 month
          </Button>
        </div>
      )}
    </Card>
  );
}
