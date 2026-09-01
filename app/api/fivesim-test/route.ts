import { NextRequest, NextResponse } from "next/server";
import { getFivesimPricesForService } from "@/lib/fivesim";
import { fivesimProductFor, fivesimCountryForIso } from "@/lib/provider-map";

/**
 * TEMPORARY diagnostic endpoint - remove after 5sim is verified.
 *
 * GET /api/fivesim-test?service=whatsapp
 *   -> returns the cheapest in-stock 5sim price per country for that service,
 *      plus a couple of resolved examples, so we can confirm:
 *        1. the FIVESIM_API_KEY works (auth)
 *        2. the price/stock parsing is correct
 *        3. the country mapping resolves
 *      all WITHOUT spending any money (prices are a guest/read call).
 */
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("service") ?? "whatsapp";

  const product = fivesimProductFor(serviceId);
  if (!product) {
    return NextResponse.json(
      { error: `No 5sim mapping for service '${serviceId}'.`, mappedServices: "see provider-map" },
      { status: 400 }
    );
  }

  try {
    const priceMap = await getFivesimPricesForService(product);

    // Show a few well-known countries resolved through the ISO mapping.
    const sampleIsos = ["us", "gb", "ar", "ng", "in"];
    const samples: Record<string, unknown> = {};
    for (const iso of sampleIsos) {
      const slug = fivesimCountryForIso(iso);
      samples[iso] = slug
        ? { slug, price: priceMap.get(slug) ?? "no stock" }
        : "no 5sim country";
    }

    return NextResponse.json({
      ok: true,
      product,
      totalCountriesWithStock: priceMap.size,
      samples,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 502 }
    );
  }
}
