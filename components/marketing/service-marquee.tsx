import Image from "next/image";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";

/**
 * Supported services scrolling past with their logos, in two rows moving
 * opposite ways - same treatment as the country flags above it.
 *
 * IDs are the ones in lib/smspva-services.ts, not guesses: several differ
 * from the obvious name ("instagram-threads", not "instagram"), and a wrong
 * ID silently falls back to a grey initial instead of a logo. Every entry
 * below was checked against the catalog and has hasCustomLogo: true.
 */

const ROW_A = [
  "whatsapp",
  "telegram",
  "instagram-threads",
  "google-youtube-gmail",
  "facebook",
  "tiktok",
  "discord",
  "x-twitter",
  "signal",
  "amazon",
  "paypal-ebay",
  "uber",
  "airbnb",
  "steam",
];

const ROW_B = [
  "linkedin",
  "netflix",
  "apple",
  "microsoft-azure-bing-skype-etc",
  "snapchat",
  "viber",
  "revolut",
  "wise",
  "payoneer",
  "bolt",
  "shopee",
  "reddit",
  "twitch",
  "lyft",
];

/** Trim the catalog's parenthetical suffixes so pills stay short. */
function shortName(name: string) {
  return name.replace(/\s*\(.*?\)\s*$/, "").replace(/\s*\+\s*Ebay$/i, "");
}

function Pill({ id }: { id: string }) {
  const service = SMSPVA_SERVICES.find((s) => s.id === id);
  if (!service) return null;

  return (
    <div className="mr-2 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
      {service.hasCustomLogo ? (
        <span className="relative block h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[4px]">
          <Image src={service.logoUrl} alt="" fill sizes="20px" className="object-contain" />
        </span>
      ) : (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-muted text-[9px] font-semibold text-muted-foreground">
          {service.name.slice(0, 1)}
        </span>
      )}
      <span className="whitespace-nowrap text-[12.5px] text-foreground">
        {shortName(service.name)}
      </span>
    </div>
  );
}

function Track({ ids, dir }: { ids: string[]; dir: "left" | "right" }) {
  const items = [...ids, ...ids];
  return (
    <div className="lp-marquee relative overflow-hidden">
      <div
        className={`lp-marquee-track ${
          dir === "left" ? "lp-marquee-left" : "lp-marquee-right"
        }`}
      >
        {items.map((id, i) => (
          <Pill key={`${id}-${i}`} id={id} />
        ))}
      </div>
    </div>
  );
}

export function ServiceMarquee() {
  return (
    <div className="relative">
      <div className="space-y-2">
        <Track ids={ROW_A} dir="left" />
        <Track ids={ROW_B} dir="right" />
      </div>

      {/* Fade the edges so rows dissolve rather than being cut off. */}
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
