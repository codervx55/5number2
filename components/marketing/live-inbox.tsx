"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageSquare, Phone } from "lucide-react";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";

/**
 * The hero's signature moment: a phone panel where verification codes keep
 * arriving. It loops indefinitely, so the page always looks alive.
 *
 * Two deliberate touches:
 *  - the newest message flashes once, so the eye is drawn to the change
 *    rather than the whole list re-animating
 *  - the code's digits scramble briefly before settling, which reads as
 *    "receiving" rather than "text appeared"
 */

interface Msg {
  /** Catalog id from lib/smspva-services.ts - drives the logo. */
  serviceId: string;
  service: string;
  code: string;
  body: (code: string) => string;
  number: string;
  flag: string;
}

const SCRIPT: Msg[] = [
  {
    serviceId: "telegram",
    service: "Telegram",
    code: "482915",
    body: (c) => `Login code: ${c}. Do not share it with anyone.`,
    number: "+44 7822 014 559",
    flag: "gb",
  },
  {
    serviceId: "whatsapp",
    service: "WhatsApp",
    code: "710433",
    body: (c) => `${c} is your WhatsApp code. Don't share it.`,
    number: "+1 415 802 7731",
    flag: "us",
  },
  {
    serviceId: "instagram-threads",
    service: "Instagram",
    code: "336102",
    body: (c) => `${c} is your Instagram code.`,
    number: "+234 810 447 2290",
    flag: "ng",
  },
  {
    serviceId: "discord",
    service: "Discord",
    code: "905517",
    body: (c) => `Your Discord verification code is ${c}.`,
    number: "+91 76210 33847",
    flag: "in",
  },
  {
    serviceId: "tiktok",
    service: "TikTok",
    code: "224860",
    body: (c) => `${c} is your TikTok code.`,
    number: "+63 917 220 4418",
    flag: "ph",
  },
];

/** Service logo, falling back to an initial if the catalog has no image. */
function ServiceLogo({ serviceId, name }: { serviceId: string; name: string }) {
  const service = SMSPVA_SERVICES.find((s) => s.id === serviceId);
  if (!service?.hasCustomLogo) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <span className="relative block h-6 w-6 shrink-0 overflow-hidden rounded-md">
      <Image src={service.logoUrl} alt="" fill sizes="24px" className="object-contain" />
    </span>
  );
}

const CYCLE_MS = 2600;
const MAX_VISIBLE = 4;

/** Digits that scramble for a beat, then settle to the real code. */
function SettlingCode({ code }: { code: string }) {
  const [shown, setShown] = useState(code);
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    let ticks = 0;
    const id = setInterval(() => {
      ticks++;
      if (ticks > 6) {
        setShown(code);
        settled.current = true;
        clearInterval(id);
        return;
      }
      // Reveal left-to-right; the unresolved tail keeps rolling.
      const fixed = Math.min(code.length, Math.floor(ticks / 1.2));
      const rolling = Array.from({ length: code.length - fixed }, () =>
        String(Math.floor(Math.random() * 10))
      ).join("");
      setShown(code.slice(0, fixed) + rolling);
    }, 55);
    return () => clearInterval(id);
  }, [code]);

  return (
    <span className="font-mono text-[13px] font-semibold tabular-nums tracking-[0.12em] text-primary-700">
      {shown}
    </span>
  );
}

export function LiveInbox() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  // Build the visible stack: newest first, wrapping around the script.
  const visible = Array.from({ length: MAX_VISIBLE }, (_, i) => {
    const idx = (((tick - i) % SCRIPT.length) + SCRIPT.length) % SCRIPT.length;
    return { ...SCRIPT[idx], key: `${tick - i}` };
  });

  const current = visible[0];

  return (
    <div className="lp-rise overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_60px_-24px_rgba(15,32,60,0.28)]">
      {/* Current number */}
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600/10">
          <Phone size={14} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[13.5px] font-medium tracking-wide text-foreground">
            {current.number}
          </p>
          <p className="text-[11.5px] text-muted-foreground">Receiving now</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-600/10 px-2 py-1 text-[11px] font-medium text-primary-700">
          <span className="lp-blink h-1.5 w-1.5 rounded-full bg-primary-600" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-2 px-4 py-3.5">
        <div className="flex items-center gap-1.5 pb-0.5">
          <MessageSquare size={13} className="text-muted-foreground" />
          <span className="text-[11.5px] font-medium text-muted-foreground">Inbox</span>
        </div>

        {visible.map((m, i) => (
          <div
            key={m.key}
            className={`rounded-xl border border-border px-3.5 py-2.5 ${
              i === 0 ? "lp-msg-in lp-flash" : "bg-white"
            }`}
            style={{ opacity: 1 - i * 0.2 }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <ServiceLogo serviceId={m.serviceId} name={m.service} />
                <span className="truncate text-[12.5px] font-semibold text-foreground">
                  {m.service}
                </span>
              </span>
              {i === 0 ? (
                <SettlingCode code={m.code} />
              ) : (
                <span className="font-mono text-[13px] font-semibold tabular-nums tracking-[0.12em] text-muted-foreground">
                  {m.code}
                </span>
              )}
            </div>
            <p className="mt-1 truncate pl-8 text-[12px] text-muted-foreground">{m.body(m.code)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
