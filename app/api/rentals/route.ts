import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SMSPVA_SERVICES } from "@/lib/smspva-services";
import { SMSPVA_COUNTRIES } from "@/lib/smspva-countries";
import { getRentOptions, createRentOrder, type RentDurationType } from "@/lib/smspva";

/**
 * GET /api/rentals?country=KZ&dtype=week&dcount=1
 * Live rental pricing/stock for every service in a country, for a given
 * duration - mirrors /api/listings but for the rental (week/month) side.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryCode = searchParams.get("country");
  const dtype = (searchParams.get("dtype") as RentDurationType) || "week";
  const dcount = Number(searchParams.get("dcount") || "1");

  if (!countryCode) {
    return NextResponse.json({ error: "country is required." }, { status: 400 });
  }

  const country = SMSPVA_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }

  try {
    const options = await getRentOptions(countryCode, dtype, dcount);
    return NextResponse.json(options);
  } catch (err) {
    console.error("Failed to fetch rental options:", err);
    return NextResponse.json({ error: "Failed to fetch rental options." }, { status: 502 });
  }
}

/**
 * POST /api/rentals
 * Body: { serviceId: string, countryCode: string, dtype: "week"|"month", dcount: number }
 *
 * Buys a rental number. Same pattern as POST /api/orders: price is
 * re-checked live server-side, the provider is charged FIRST, and the
 * wallet is only debited after that succeeds.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const serviceId = body?.serviceId as string | undefined;
  const countryCode = body?.countryCode as string | undefined;
  const dtype = (body?.dtype as RentDurationType | undefined) ?? "week";
  const dcount = Number(body?.dcount ?? 1);

  if (!serviceId || !countryCode || !dcount || dcount < 1) {
    return NextResponse.json(
      { error: "serviceId, countryCode, and a valid dcount are required." },
      { status: 400 }
    );
  }
  if (dtype !== "week" && dtype !== "month") {
    return NextResponse.json({ error: "dtype must be 'week' or 'month'." }, { status: 400 });
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
    // Re-check live price right before charging - protects against stale
    // prices shown in the UI and against something selling out in the
    // meantime.
    const options = await getRentOptions(country.code, dtype, dcount);
    const match = options.services?.find(
      (s: any) => s.code === service.code || s.service === service.code
    );
    const price = Number(match?.price ?? match?.cost);

    if (!match || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Out of stock for this duration." }, { status: 409 });
    }

    if (Number(dbUser.walletBalance) < price) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
    }

    // Reserve the real number from the provider FIRST - only charge the
    // wallet if this succeeds, so a provider failure never costs the user.
    const rented = await createRentOrder(country.code, service.code, dtype, dcount);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: dbUser.id,
          platform: service.id,
          country: country.code,
          price,
          status: "waiting",
          provider: "smspva",
          providerOrderId: rented.providerOrderId,
          phoneNumber: rented.phoneNumber,
          expiresAt: rented.expiresAt,
          orderType: "rental",
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
          label: `${service.name} - ${country.name} (${dcount} ${dtype}${dcount > 1 ? "s" : ""} rental)`,
          amount: -price,
          reference: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Rental order creation failed:", err);
    return NextResponse.json({ error: "Failed to complete rental purchase." }, { status: 502 });
  }
}