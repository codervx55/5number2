import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { getAllPricesForService, getAllCountsForService, requestNumber } from "@/lib/smspva";
import { getFivesimPricesForService, buyFivesimNumber } from "@/lib/fivesim";
import { fivesimProductFor, fivesimCountryForIso } from "@/lib/provider-map";
import { applyMargin } from "@/lib/pricing";

const ACTIVATION_TTL_MS = 1000 * 60 * 15; // 15 minutes

/**
 * POST /api/orders
 * Body: { serviceId, countryCode, provider?: "smspva" | "5sim" }
 *
 * Buys a real number from the chosen provider. Price + stock are always
 * re-checked live server-side right before charging - never trust anything
 * the client sends, and always use the SAME price source the listing used so
 * the charge matches the displayed price.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const serviceId = body?.serviceId as string | undefined;
  const countryCode = body?.countryCode as string | undefined;
  const provider = (body?.provider as string | undefined) === "5sim" ? "5sim" : "smspva";

  if (!serviceId || !countryCode) {
    return NextResponse.json(
      { error: "serviceId and countryCode are required." },
      { status: 400 }
    );
  }

  const service = SMSPVA_SERVICES.find((s) => s.id === serviceId);
  const country = SMSPVA_COUNTRIES.find((c) => c.code === countryCode);
  if (!service || !country) {
    return NextResponse.json({ error: "Unknown service or country." }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  try {
    // Resolve live provider price + reserve details, per provider.
    let price: number;
    let providerOrderId: string;
    let phoneNumber: string;

    if (provider === "5sim") {
      const product = fivesimProductFor(serviceId);
      const slug = country.isoCode ? fivesimCountryForIso(country.isoCode) : null;
      if (!product || !slug) {
        return NextResponse.json({ error: "5sim not available for this selection." }, { status: 400 });
      }

      // Re-check the cheapest in-stock 5sim operator/price for this country.
      const priceMap = await getFivesimPricesForService(product);
      const info = priceMap.get(slug);
      if (!info || !Number.isFinite(info.price) || info.price <= 0 || info.count <= 0) {
        return NextResponse.json({ error: "Out of stock." }, { status: 409 });
      }

      price = applyMargin(info.price);
      if (Number(dbUser.walletBalance) < price) {
        return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
      }

      // Reserve from 5sim FIRST (the SAME operator we priced), only charge
      // after it succeeds so a provider failure never costs the user.
      const bought = await buyFivesimNumber(slug, product, info.operator);
      providerOrderId = bought.providerOrderId;
      phoneNumber = bought.phoneNumber;
    } else {
      // SMSPVA path - price from Total_ operator (getAllPricesForService),
      // stock from V2 counts (matches the listing so no false out-of-stock).
      const [countMap, priceMap] = await Promise.all([
        getAllCountsForService(service.code),
        getAllPricesForService(service.code),
      ]);

      const providerPrice = priceMap?.get(country.code.toUpperCase());
      if (providerPrice === undefined || !Number.isFinite(providerPrice)) {
        return NextResponse.json({ error: "Price unavailable, try again." }, { status: 502 });
      }
      price = applyMargin(providerPrice);

      const stock = countMap?.get(country.code.toUpperCase()) ?? 0;
      if (stock <= 0) {
        return NextResponse.json({ error: "Out of stock." }, { status: 409 });
      }
      if (Number(dbUser.walletBalance) < price) {
        return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
      }

      const reserved = await requestNumber(service.code, country.code);
      providerOrderId = reserved.providerOrderId;
      phoneNumber = reserved.phoneNumber;
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: dbUser.id,
          platform: service.id,
          country: country.code,
          price,
          status: "waiting",
          provider,
          providerOrderId,
          phoneNumber,
          expiresAt: new Date(Date.now() + ACTIVATION_TTL_MS),
          orderType: "activation",
        },
      });

      await tx.user.update({
        where: { id: dbUser.id },
        data: { walletBalance: { decrement: price } },
      });

      await tx.transaction.create({
        data: {
          userId: dbUser.id,
          type: "purchase",
          method: "wallet",
          label: `${service.name} - ${country.name} (${provider})`,
          amount: -price,
          reference: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Order creation failed:", err);
    return NextResponse.json({ error: "Failed to complete purchase." }, { status: 502 });
  }
}

/**
 * GET /api/orders
 * Returns the current user's active (waiting/received) orders, most recent
 * first - used to restore the "active number" panel on page load/refresh.
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
      status: { in: ["waiting", "received"] },
    },
    include: { messages: { orderBy: { receivedAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}
