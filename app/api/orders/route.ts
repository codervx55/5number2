import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { getPrice, getStock, requestNumber } from "@/lib/smspva";

const ACTIVATION_TTL_MS = 1000 * 60 * 15; // 15 minutes, matches old mock behavior

/**
 * POST /api/orders
 * Body: { serviceId: string, countryCode: string }
 *
 * Buys a real number. Price is re-checked live server-side right before
 * purchase - never trust a price the client sends, since that's the kind of
 * thing a modified request could tamper with.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const serviceId = body?.serviceId as string | undefined;
  const countryCode = body?.countryCode as string | undefined;

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

  // Look up the wallet-holding user row. This assumes the User table's id
  // matches the Supabase auth user id (standard pattern when Supabase Auth
  // issues the id used everywhere else). If your signup flow creates the
  // User row under a different id, adjust this lookup accordingly.
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  try {
    // Re-verify live price + stock right before charging - protects against
    // stale prices and against buying something that just sold out.
    const [stock, price] = await Promise.all([
      getStock(service.code, country.code),
      getPrice(service.code, country.code),
    ]);

    if (stock <= 0) {
      return NextResponse.json({ error: "Out of stock." }, { status: 409 });
    }

    if (Number(dbUser.walletBalance) < price) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
    }

    // Reserve the real number from the provider FIRST - only charge the
    // wallet if this succeeds, so a provider failure never costs the user.
    const { providerOrderId, phoneNumber } = await requestNumber(service.code, country.code);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: dbUser.id,
          platform: service.id,
          country: country.code,
          price,
          status: "waiting",
          provider: "smspva",
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
          label: `${service.name} - ${country.name}`,
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
