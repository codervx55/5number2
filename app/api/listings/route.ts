import { NextRequest, NextResponse } from "next/server";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import {
  getStock,
  getPrice,
  getAllPricesForService,
  getAllCountsForService,
} from "@/lib/smspva";
import { applyMargin } from "@/lib/pricing";
import { Listing } from "@/lib/types";
import { getFivesimPricesForService } from "@/lib/fivesim";
import { fivesimProductFor, fivesimCountryForIso } from "@/lib/provider-map";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { listings: Listing[]; expiresAt: number }>();

async function fetchListingsBulk(serviceId: string): Promise<Listing[] | null> {
  const service = SMSPVA_SERVICES.find((s) => s.id === serviceId);
  if (!service) return null;

  const [prices, counts] = await Promise.all([
    getAllPricesForService(service.code),
    getAllCountsForService(service.code),
  ]);

  if (!prices || !counts) return null;

  const known = new Set(SMSPVA_COUNTRIES.map((c) => c.code));
  const listings: Listing[] = [];

  for (const [countryCode, stock] of counts) {
    if (stock <= 0) continue;
    if (!known.has(countryCode)) continue;
    const price = prices.get(countryCode);
    if (price === undefined) continue;

    listings.push({
      id: `smspva-${countryCode}-${service.id}`,
      countryCode,
      serviceId: service.id,
      priceInPoints: applyMargin(price, "smspva"),
      successRate: 0,
      stock,
      provider: "smspva",
    });
  }

  return listings.length > 0 ? listings : null;
}

async function fetchLiveListingsForService(serviceId: string): Promise<Listing[]> {
  const service = SMSPVA_SERVICES.find((s) => s.id === serviceId);
  if (!service) return [];

  const CONCURRENCY = 4;
  const results: Listing[] = [];

  for (let i = 0; i < SMSPVA_COUNTRIES.length; i += CONCURRENCY) {
    const batch = SMSPVA_COUNTRIES.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (country) => {
        try {
          const [stock, price] = await Promise.all([
            getStock(service.code, country.code),
            getPrice(service.code, country.code),
          ]);
          if (stock <= 0) return null;
          const listing: Listing = {
            id: `smspva-${country.code}-${service.id}`,
            countryCode: country.code,
            serviceId: service.id,
            priceInPoints: applyMargin(price, "smspva"),
            successRate: 0,
            stock,
            provider: "smspva",
          };
          return listing;
        } catch (err) {
          console.error(`SMSPVA lookup failed for ${service.code}/${country.code}:`, err);
          return null;
        }
      })
    );
    results.push(...batchResults.filter((l): l is Listing => l !== null));
  }

  return results;
}

async function fetchFivesimListings(serviceId: string): Promise<Listing[]> {
  const product = fivesimProductFor(serviceId);
  if (!product) return [];

  try {
    const priceMap = await getFivesimPricesForService(product);
    if (priceMap.size === 0) return [];

    const out: Listing[] = [];
    for (const c of SMSPVA_COUNTRIES) {
      const slug = c.isoCode ? fivesimCountryForIso(c.isoCode) : null;
      if (!slug) continue;
      const info = priceMap.get(slug);
      if (!info) continue;

      out.push({
        id: `5sim-${c.code}-${serviceId}`,
        countryCode: c.code,
        serviceId,
        priceInPoints: applyMargin(info.price, "5sim"),
        successRate: 0,
        stock: info.count,
        provider: "5sim",
        fivesimCountry: slug,
        fivesimOperator: info.operator,
        fivesimProduct: product,
      });
    }
    return out;
  } catch (err) {
    console.error("5sim listings fetch failed (non-fatal):", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("service");

  if (!serviceId) {
    return NextResponse.json(
      { error: "Missing required 'service' query param." },
      { status: 400 }
    );
  }

  const cached = cache.get(serviceId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ listings: cached.listings, cached: true });
  }

  try {
    const [bulk, fivesimRows] = await Promise.all([
      fetchListingsBulk(serviceId),
      fetchFivesimListings(serviceId),
    ]);
    const smspvaRows = bulk ?? (await fetchLiveListingsForService(serviceId));
    const listings = [...smspvaRows, ...fivesimRows];

    cache.set(serviceId, { listings, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ listings, cached: false, fast: Boolean(bulk) });
  } catch (err) {
    console.error("Failed to fetch listings:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings from provider." },
      { status: 502 }
    );
  }
}
