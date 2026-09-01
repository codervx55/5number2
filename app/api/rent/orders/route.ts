import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SMSPVA_RENT_SERVICES } from "@/lib/smspva-rent-services";
import { SMSPVA_RENT_COUNTRIES } from "@/lib/smspva-rent-countries";
import { createRentOrder, getRentPricing, RentDurationType } from "@/lib/smspva-rental";
import { applyMargin } from "@/lib/pricing";

/**
 * POST /api/rent/orders
 * Body: { serviceId: string, countryCode: string, dtype: "week"|"month", dcount: number }
 *
 * Buys a new rental number. Price is re-checked live server-side right
 * before purchase, same pattern as POST /api/orders for activations.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const serviceId = body?.serviceId as string | undefined;
  const countryCode = body?.countryCode as string | undefined;
  const dtype = body?.dtype as RentDurationType | undefined;
  const dcount = Number(body?.dcount);

  if (!serviceId || !countryCode || !dtype || !dcount || dcount < 1) {
    return NextResponse.json(
      { error: "serviceId, countryCode, dtype, and dcount are required." },
      { status: 400 }
    );
  }
  if (dtype !== "week" && dtype !== "month") {
    return NextResponse.json({ error: "dtype must be 'week' or 'month'." }, { status: 400 });
  }

  const service = SMSPVA_RENT_SERVICES.find((s) => s.id === serviceId);
  const country = SMSPVA_RENT_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }
  // serviceId here is the SMSPVA service code (e.g. "opt77") straight from
  // /api/rent/pricing - the local catalog is only used for a friendly name.
  const serviceCode = service?.code ?? serviceId;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  try {
    // Re-verify live price right before charging.
    const { services: pricing } = await getRentPricing(country.code, dtype, dcount);
    const match = pricing.find((p) => p.serviceCode === serviceCode);
    if (!match || !match.available) {
      return NextResponse.json({ error: "Out of stock." }, { status: 409 });
    }

    // SMSPVA quotes rentals per DAY (price_day), so the charge is
    // price_day x the number of days, plus our margin. Must use the same
    // applyMargin() the pricing endpoint uses, or the user gets charged
    // something different from the price shown on the card.
    const days = dcount * (dtype === "week" ? 7 : 30);
    const price = Number((applyMargin(match.pricePerDay) * days).toFixed(2));
    const serviceName = match.name || service?.name || serviceCode;

    if (Number(dbUser.walletBalance) < price) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
    }

    // Reserve the real rental number FIRST - only charge the wallet if this
    // succeeds, so a provider failure never costs the user.
    const providerResult = await createRentOrder(country.code, serviceCode, dtype, dcount);
    const expiresAt = providerResult.until
      ? new Date(providerResult.until * 1000)
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: dbUser.id,
          platform: serviceCode,
          country: country.code,
          price,
          status: "active",
          provider: "smspva",
          providerOrderId: providerResult.providerOrderId,
          phoneNumber: providerResult.phoneNumber,
          expiresAt,
          orderType: "rent",
          rentDtype: dtype,
          rentDcount: dcount,
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
          label: `Rent: ${serviceName} - ${country.name} (${dcount} ${dtype}${dcount > 1 ? "s" : ""})`,
          amount: -price,
          reference: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Rent order creation failed:", err);
    return NextResponse.json({ error: "Failed to complete rental purchase." }, { status: 502 });
  }
}

/**
 * GET /api/rent/orders
 * Returns the current user's active rental orders, most recent first.
 * Unlike Activation (one "active" order at a time), a user can have several
 * concurrent rentals, so this returns a list rather than a single order.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Default: active rentals only. With ?history=1, return all rentals
  // (active, cancelled, expired) so the My Rentals page can show full history.
  const history = req.nextUrl.searchParams.get("history") === "1";

  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
      orderType: "rent",
      ...(history ? {} : { status: "active" }),
    },
    include: { messages: { orderBy: { receivedAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    ...(history ? { take: 100 } : {}),
  });

  return NextResponse.json({ orders });
}
