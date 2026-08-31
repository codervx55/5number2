import Image from "next/image";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";

/**
 * Two rows of country flags scrolling in opposite directions.
 *
 * Each track renders its list twice - the CSS shifts by exactly -50%, so
 * the loop point lands on an identical frame and there's no visible jump.
 * Hovering pauses it, which makes the strip feel like something you can
 * look at rather than decoration sliding past.
 */

const ROW_A = [
  "gb", "us", "ng", "in", "id", "ph", "de", "fr", "es", "it", "br", "ca",
  "pl", "ro", "nl", "pt", "gr", "za", "ke", "tr",
];
const ROW_B = [
  "au", "mx", "ar", "jp", "vn", "th", "my", "se", "no", "dk", "fi", "ie",
  "cz", "hu", "ua", "kz", "il", "sg", "hk", "be",
];

function nameFor(iso: string) {
  return SMSPVA_COUNTRIES.find((c) => c.isoCode === iso)?.name ?? iso.toUpperCase();
}

function Row({ codes, dir }: { codes: string[]; dir: "left" | "right" }) {
  const items = [...codes, ...codes];
  return (
    <div className="lp-marquee relative overflow-hidden">
      <div
        className={`lp-marquee-track ${
          dir === "left" ? "lp-marquee-left" : "lp-marquee-right"
        }`}
      >
        {items.map((iso, i) => (
          <div
            key={`${iso}-${i}`}
            className="mr-2 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
          >
            <span className="relative block h-[13px] w-[18px] overflow-hidden rounded-[2px] border border-border/70">
              <Image
                src={`https://flagcdn.com/w40/${iso}.png`}
                alt=""
                fill
                sizes="20px"
                className="object-cover"
              />
            </span>
            <span className="whitespace-nowrap text-[12.5px] text-foreground">{nameFor(iso)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlagMarquee() {
  return (
    <div className="relative">
      <div className="space-y-2">
        <Row codes={ROW_A} dir="left" />
        <Row codes={ROW_B} dir="right" />
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
