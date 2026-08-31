import { NextRequest, NextResponse } from "next/server";
import { getRentPricing, RentDurationType } from "@/lib/smspva-rental";
import { applyMargin } from "@/lib/pricing";

/**
 * In-memory cache keyed by country+duration - same pattern as
 * /api/listings for the Activation API, to avoid hammering SMSPVA on every
 * page load. Resets on deploy/restart; move to Redis if scaling to
 * multiple instances.
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { services: any[]; expiresAt: number }>();

// SMSPVA serves service icons from this base; the API returns paths
// relative to it (e.g. "images/ico/airbnb.ico").
const SMSPVA_IMG_BASE = "https://smspva.com/templates/New_Design_Multilang/";

export async function GET(req: NextRequest) {
  const countryCode = req.nextUrl.searchParams.get("country");
  const dtype = (req.nextUrl.searchParams.get("dtype") ?? "week") as RentDurationType;
  const dcount = Number(req.nextUrl.searchParams.get("dcount") ?? "1");

  if (!countryCode) {
    return NextResponse.json({ error: "Missing required 'country' query param." }, { status: 400 });
  }

  const cacheKey = `${countryCode}:${dtype}:${dcount}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ services: cached.services, cached: true });
  }

  try {
    const { services: pricing } = await getRentPricing(countryCode, dtype, dcount);

    // The rental API returns its own service names/icons, so we use those
    // directly rather than joining against a local catalog - that way any
    // service SMSPVA adds shows up automatically.
    const services = pricing
      .filter((p) => p.available)
      .map((p) => ({
        id: p.serviceCode,
        code: p.serviceCode,
        name: p.name,
        logoUrl: p.imgPath ? `${SMSPVA_IMG_BASE}${p.imgPath}` : "",
        hasCustomLogo: Boolean(p.imgPath),
        pricePerDay: applyMargin(p.pricePerDay),
        totalCount: p.totalCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.set(cacheKey, { services, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ services, cached: false });
  } catch (err) {
    console.error("Failed to fetch rent pricing:", err);
    return NextResponse.json({ error: "Failed to fetch pricing from provider." }, { status: 502 });
  }
}
