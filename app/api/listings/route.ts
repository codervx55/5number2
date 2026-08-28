import { NextRequest, NextResponse } from "next/server";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { getStock, getPrice } from "@/lib/smspva";
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
 * TODO (verify against SMSPVA docs): if SMSPVA's get_count_new supports a
 * "country=0" or similar "all countries" mode that returns stock for every
 * country in a single call, use that instead of fanning out one request per
 * country below - it would cut this from ~250 requests to 1 per service.
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
            priceInPoints: price,
            successRate: 0, // TODO: SMSPVA doesn't expose this - drop from UI or source elsewhere
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
    const listings = await fetchLiveListingsForService(serviceId);
    cache.set(serviceId, { listings, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ listings, cached: false });
  } catch (err) {
    console.error("Failed to fetch listings:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings from provider." },
      { status: 502 }
    );
  }
}
