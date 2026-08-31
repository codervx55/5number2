"use client";

import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Listing, SmspvaCountry, SmspvaService } from "@/lib/types";
import { CountryFlag } from "./country-flag";
import { SmspvaServiceIcon } from "./smspva-service-icon";
import { SearchableSelect } from "./searchable-select";

// Curated shortlist shown as quick-tap cards; everything else lives in the
// searchable "browse all services" dropdown so 263 options don't overwhelm.
const POPULAR_SERVICE_IDS = [
  "whatsapp",
  "telegram",
  "google-youtube-gmail",
  "facebook",
  "instagram-threads",
  "tiktok",
  "discord",
  "amazon",
  "netflix",
  "paypal-ebay",
  "steam",
  "apple",
];

export function ServiceCountryPicker({
  services,
  countries,
  listings,
  activeService,
  onServiceChange,
  activeCountry,
  onCountryChange,
}: {
  services: SmspvaService[];
  countries: SmspvaCountry[];
  listings: Listing[];
  activeService: SmspvaService | null;
  onServiceChange: (s: SmspvaService | null) => void;
  activeCountry: SmspvaCountry | null;
  onCountryChange: (c: SmspvaCountry | null) => void;
}) {
  const popularServices = POPULAR_SERVICE_IDS
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is SmspvaService => Boolean(s));

  // Always show every country, regardless of live stock for the picked service.
  const availableCountries = countries;

  function handleServiceSelect(s: SmspvaService | null) {
    onServiceChange(s);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-card">
      {/* Step 1 - service */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] font-semibold text-white">
            1
          </span>
          <p className="text-[13.5px] font-semibold text-foreground">Choose a service</p>
          {activeService && (
            <span className="ml-auto flex items-center gap-1 text-[12px] font-medium text-primary-700">
              <Check size={13} />
              {activeService.name}
            </span>
          )}
        </div>

        <div className="mb-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
          {popularServices.map((s) => (
            <button
              key={s.id}
              onClick={() => handleServiceSelect(s)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md border p-2.5 transition-colors",
                activeService?.id === s.id
                  ? "border-primary-600 bg-primary-50"
                  : "border-border bg-white hover:bg-muted/60"
              )}
            >
              <SmspvaServiceIcon service={s} size={26} />
              <span className="line-clamp-1 text-center text-[11px] font-medium text-foreground">
                {s.name}
              </span>
            </button>
          ))}
        </div>

        <SearchableSelect
          items={services}
          selected={activeService}
          onSelect={handleServiceSelect}
          getKey={(s) => s.id}
          getLabel={(s) => s.name}
          renderIcon={(s) => <SmspvaServiceIcon service={s} size={18} />}
          allLabel="Browse all 263 services"
          placeholder="Search services…"
          buttonClassName="w-full sm:w-auto"
        />
      </div>

      {/* Step 2 - country, gated behind step 1 */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
              activeService ? "bg-primary-600 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            2
          </span>
          <p
            className={cn(
              "text-[13.5px] font-semibold",
              activeService ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Choose a country
          </p>
          {activeCountry && (
            <span className="ml-auto flex items-center gap-1 text-[12px] font-medium text-primary-700">
              <Check size={13} />
              {activeCountry.name}
            </span>
          )}
        </div>

        {!activeService ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-[12.5px] text-muted-foreground">
            <ArrowRight size={14} />
            Pick a service above, then choose any country.
          </div>
        ) : (
          <SearchableSelect
            items={availableCountries}
            selected={activeCountry}
            onSelect={onCountryChange}
            getKey={(c) => c.code}
            getLabel={(c) => c.name}
            renderIcon={(c) => <CountryFlag isoCode={c.isoCode} size={18} />}
            allLabel={`All countries (${availableCountries.length})`}
            placeholder="Search country…"
            buttonClassName="w-full sm:w-auto"
          />
        )}
      </div>
    </div>
  );
}