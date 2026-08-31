import Image from "next/image";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";

/**
 * A strip of numbers scrolling past, each tagged with the service it's for
 * and the country it's from.
 *
 * The numbers are deliberately MASKED. Real available numbers aren't
 * revealed until someone buys one - showing full digits here would either
 * be inventing fake stock or leaking real numbers, and neither is honest.
 * Masking matches what the product actually does.
 */

interface Row {
  serviceId: string;
  iso: string;
  dial: string;
  head: string;
  tail: string;
}

const ROW_A: Row[] = [
  { serviceId: "whatsapp", iso: "gb", dial: "+44", head: "7822", tail: "59" },
  { serviceId: "telegram", iso: "us", dial: "+1", head: "415", tail: "31" },
  { serviceId: "instagram-threads", iso: "ng", dial: "+234", head: "810", tail: "90" },
  { serviceId: "google-youtube-gmail", iso: "in", dial: "+91", head: "762", tail: "47" },
  { serviceId: "facebook", iso: "id", dial: "+62", head: "812", tail: "14" },
  { serviceId: "tiktok", iso: "ph", dial: "+63", head: "917", tail: "18" },
  { serviceId: "discord", iso: "de", dial: "+49", head: "151", tail: "72" },
  { serviceId: "x-twitter", iso: "fr", dial: "+33", head: "612", tail: "05" },
];

const ROW_B: Row[] = [
  { serviceId: "amazon", iso: "es", dial: "+34", head: "612", tail: "88" },
  { serviceId: "paypal-ebay", iso: "it", dial: "+39", head: "320", tail: "41" },
  { serviceId: "uber", iso: "br", dial: "+55", head: "119", tail: "63" },
  { serviceId: "airbnb", iso: "ca", dial: "+1", head: "604", tail: "27" },
  { serviceId: "steam", iso: "pl", dial: "+48", head: "512", tail: "36" },
  { serviceId: "linkedin", iso: "ro", dial: "+40", head: "722", tail: "50" },
  { serviceId: "signal", iso: "nl", dial: "+31", head: "612", tail: "94" },
  { serviceId: "coinbase", iso: "za", dial: "+27", head: "823", tail: "11" },
];

function Pill({ row }: { row: Row }) {
  const service = SMSPVA_SERVICES.find((s) => s.id === row.serviceId);
  const country = SMSPVA_COUNTRIES.find((c) => c.isoCode === row.iso);

  return (
    <div className="mr-2 flex shrink-0 items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2">
      {service?.hasCustomLogo ? (
        <span className="relative block h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[4px]">
          <Image src={service.logoUrl} alt="" fill sizes="20px" className="object-contain" />
        </span>
      ) : (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-muted text-[9px] font-semibold text-muted-foreground">
          {(service?.name ?? "?").slice(0, 1)}
        </span>
      )}

      <span className="whitespace-nowrap font-mono text-[12.5px] tracking-wide text-foreground">
        {row.dial} {row.head} •••• {row.tail}
      </span>

      <span className="relative block h-[12px] w-[16px] shrink-0 overflow-hidden rounded-[2px] border border-border/70">
        <Image
          src={`https://flagcdn.com/w40/${row.iso}.png`}
          alt={country?.name ?? ""}
          fill
          sizes="18px"
          className="object-cover"
        />
      </span>
    </div>
  );
}

function Track({ rows, dir }: { rows: Row[]; dir: "left" | "right" }) {
  const items = [...rows, ...rows];
  return (
    <div className="lp-marquee relative overflow-hidden">
      <div
        className={`lp-marquee-track ${
          dir === "left" ? "lp-marquee-left" : "lp-marquee-right"
        }`}
      >
        {items.map((r, i) => (
          <Pill key={`${r.serviceId}-${r.iso}-${i}`} row={r} />
        ))}
      </div>
    </div>
  );
}

export function NumberMarquee() {
  return (
    <div className="relative">
      <div className="space-y-2">
        <Track rows={ROW_A} dir="left" />
        <Track rows={ROW_B} dir="right" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}
