"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, RefreshCcw, Check, Clock, Inbox, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Order } from "@/lib/types";
import { CountryFlag } from "./country-flag";
import { SmspvaServiceIcon } from "./smspva-service-icon";
import { countries, services } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export function ActiveNumberPanel({
  order,
  onRelease,
  onSimulateSms,
}: {
  order: Order;
  onRelease: () => void;
  onSimulateSms: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const country = countries.find((c) => c.code === order.listing.countryCode)!;
  const service = services.find((s) => s.id === order.listing.serviceId)!;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000))
  );

  // Users can cancel for a refund only after waiting this long, so they don't
  // cancel a number a split-second before its code actually arrives.
  const CANCEL_UNLOCK_SECONDS = 80;
  const [cancelIn, setCancelIn] = useState(CANCEL_UNLOCK_SECONDS);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setCancelIn((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const canCancel = cancelIn === 0 && order.messages.length === 0;
  const cm = String(Math.floor(cancelIn / 60)).padStart(2, "0");
  const cs = String(cancelIn % 60).padStart(2, "0");

  function handleCopy() {
    navigator.clipboard?.writeText(order.phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex h-full flex-col rounded-lg border border-border bg-white shadow-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2.5">
          <CountryFlag isoCode={country.isoCode} size={24} />
          <SmspvaServiceIcon service={service} size={32} />
          <div>
            <p className="text-[13.5px] font-medium text-foreground">{service.name}</p>
            <p className="text-[11.5px] text-muted-foreground">{country.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRelease} title="Release number">
          <X size={16} className="text-muted-foreground" />
        </Button>
      </div>

      {/* Revealed number */}
      <div className="border-b border-border bg-primary-50/40 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-primary-700">
            Your number
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[19px] font-semibold tracking-tight text-foreground">
              {order.phoneNumber}
            </span>
            <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check size={14} className="text-primary-600" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock size={13} />
            {secondsLeft > 0 ? (
              <span>
                Expires in <span className="font-medium tabular-nums text-foreground">{mm}:{ss}</span>
              </span>
            ) : (
              <span className="text-destructive">Number expired</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* SMS inbox */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
            <Inbox size={14} className="text-primary-600" />
            Live inbox
          </div>
          <button
            onClick={onSimulateSms}
            className="flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw size={12} />
            Refresh
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
          <AnimatePresence initial={false}>
            {order.messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center"
              >
                <p className="text-[12.5px] text-muted-foreground">
                  Waiting for SMS from {service.name}…
                </p>
                <span className="mt-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    />
                  ))}
                </span>
              </motion.div>
            )}
            {order.messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-border bg-muted/40 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground">{m.sender}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(m.receivedAt)}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{m.body}</p>
                {m.code && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-primary-50 px-2 py-1 font-mono text-[13px] font-semibold text-primary-700">
                    {m.code}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Cancel & refund - unlocks after the wait, only while no code yet */}
        <div className="mt-3 border-t border-border pt-3">
          {order.messages.length > 0 ? (
            <p className="text-center text-[11.5px] text-muted-foreground">
              Code received - this number can't be refunded.
            </p>
          ) : canCancel ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRelease}
              className="w-full text-destructive hover:bg-destructive/5"
            >
              Cancel &amp; refund
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled className="w-full">
              You can cancel in {cm}:{cs}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
