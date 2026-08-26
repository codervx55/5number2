import { Listing, Order } from "./types";
import { SMSPVA_COUNTRIES } from "./smspva-countries";
import { SMSPVA_SERVICES } from "./smspva-services";

// Real provider catalog — country/service codes go straight into SMSPVA API calls.
export const countries = SMSPVA_COUNTRIES;
export const services = SMSPVA_SERVICES;

// Deterministic pseudo-random generator so mock data is stable across renders
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * TODO (go-live): this function currently fabricates price/stock/successRate.
 * Replace it with real calls per country+service pair:
 *   - stock  -> GET https://smspva.com/priemnik.php?metod=get_count_new&service={code}&country={code}&apikey={key}
 *   - price  -> GET https://smspva.com/priemnik.php?metod=get_service_price&service={code}&country={code}&apikey={key}
 * Cache the combined result server-side (e.g. every 5-10 min) instead of calling
 * on every page load - SMSPVA allows up to 100 connections/sec but there's no
 * reason to hit it per-visitor. The number itself is only ever requested at
 * purchase time via get_number, never before - that's what keeps it hidden.
 */
// Services that a real provider almost always has stock for in every
// country - major global platforms. Everything else is a niche/regional
// service and realistically only covers a handful of countries.
const GLOBAL_SERVICE_IDS = new Set([
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
  "microsoft-azure-bing-skype-etc",
  "signal",
  "viber",
  "x-twitter",
  "linkedin",
]);

function buildListings(): Listing[] {
  const rand = seeded(42);
  const listings: Listing[] = [];
  let idx = 0;
  for (const country of countries) {
    for (const service of services) {
      const isGlobal = GLOBAL_SERVICE_IDS.has(service.id);
      // Global platforms: in stock almost everywhere (occasional real outage).
      // Niche/regional services: only a handful of countries carry them.
      // Live version: skip when get_count_new returns total === 0.
      const skipChance = isGlobal ? 0.04 : 0.94;
      if (rand() < skipChance) continue;
      idx += 1;
      const price = Math.round(8 + rand() * 42);
      const successRate = Math.round(78 + rand() * 21);
      const stock = Math.round(rand() * 400);
      listings.push({
        id: `${country.code}-${service.id}-${idx}`,
        countryCode: country.code,
        serviceId: service.id,
        priceInPoints: price,
        successRate: Math.min(successRate, 99),
        stock,
      });
    }
  }
  return listings;
}

export const listings: Listing[] = buildListings();

export const pointPackages = [
  { id: "starter", points: 100, price: 4.99, bonus: 0 },
  { id: "basic", points: 300, price: 12.99, bonus: 20 },
  { id: "popular", points: 750, price: 27.99, bonus: 75, highlight: true },
  { id: "pro", points: 1500, price: 49.99, bonus: 200 },
  { id: "business", points: 4000, price: 119.99, bonus: 700 },
];

export const mockOrders: Order[] = [
  {
    id: "ord_9182",
    listing: listings[3],
    phoneNumber: "+91 98212 44510",
    status: "received",
    purchasedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 8).toISOString(),
    pricePaid: listings[3].priceInPoints,
    messages: [
      {
        id: "m1",
        sender: "Instagram",
        body: "Your Instagram code is 482-193. Don't share this code with anyone.",
        code: "482193",
        receivedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
  },
  {
    id: "ord_7734",
    listing: listings[10],
    phoneNumber: "+1 302 555 0134",
    status: "expired",
    purchasedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    pricePaid: listings[10].priceInPoints,
    messages: [],
  },
];
