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

/**
 * In-memory cache keyed by serviceId. Avoids hammering SMSPVA on every page
 * load - per the original TODO, there's no reason to call per-visitor.
 *
 * NOTE: this cache lives in the Node process memory, so it resets on
 * deploy/restart and is NOT shared across multiple server instances. That's
 * fine for a single-instance deployment; if you scale to multiple
 * instances/regions, move this to Redis or similar shared cache.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { listings: Listing[]; expiresAt: number }>();

/**
 * Fast path: two bulk calls covering every country at once, instead of the
 * 138 requests (69 countries x price+stock) the fallback below makes.
 *
 * Returns null if either bulk response can't be parsed into anything
 * usable, so a shape mismatch degrades to "slow" rather than "empty".
 */
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
    if (!known.has(countryCode)) continue; // country we don't have metadata for
    const price = prices.get(countryCode);
    if (price === undefined) continue;

    listings.push({
      id: `${countryCode}-${service.id}`,
      countryCode,
      serviceId: service.id,
      priceInPoints: applyMargin(price),
      successRate: 0, // SMSPVA doesn't expose this - drop from UI or source elsewhere
      stock,
    });
  }

  return listings.length > 0 ? listings : null;
}

/**
 * Fallback: one request per country. Slow (SMSPVA asks for 4-5s between
 * queries, and this is ~138 of them) but it works regardless of the bulk
 * endpoints' response shapes.
 */
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
            id: `${country.code}-${service.id}`,
            countryCode: country.code,
            serviceId: service.id,
            priceInPoints: applyMargin(price),
            successRate: 0,
            stock,
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
    const bulk = await fetchListingsBulk(serviceId);
    const listings = bulk ?? (await fetchLiveListingsForService(serviceId));

    if (!bulk) {
      console.warn(
        `Bulk listing lookup unavailable for ${serviceId} - used the slow per-country path. ` +
          `Set SMSPVA_DEBUG=1 to log the raw bulk responses and fix the field mapping.`
      );
    }

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
