import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getRentPricing, prolongRentOrder, RentDurationType } from "@/lib/smspva-rental";
import { SMSPVA_RENT_SERVICES } from "@/lib/smspva-rent-services";

/**
 * PUT /api/rent/orders/[id]/prolong
 * Body: { dtype: "week"|"month", dcount: number }
 *
 * Extends an existing rental. Charges the wallet for the additional period
 * at the current live price before calling the provider, same
 * charge-then-call-provider-then-commit pattern as everywhere else... except
 * here we call the provider FIRST since prolong has no separate "reserve"
 * step - if the provider call fails, nothing is charged.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const dtype = body?.dtype as RentDurationType | undefined;
  const dcount = Number(body?.dcount);

  if (!dtype || (dtype !== "week" && dtype !== "month") || !dcount || dcount < 1) {
    return NextResponse.json({ error: "dtype ('week'|'month') and dcount are required." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: user.id, orderType: "rent", status: "active" },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  const service = SMSPVA_RENT_SERVICES.find((s) => s.id === order.platform || s.code === order.platform);
  const serviceCode = service?.code ?? order.platform;

  try {
    const { services: pricing } = await getRentPricing(order.country, dtype, dcount);
    const match = pricing.find((p) => p.serviceCode === serviceCode);
    const days = dcount * (dtype === "week" ? 7 : 30);
    const price = match
      ? Number((match.pricePerDay * days).toFixed(2))
      : Number(order.price);
    const serviceName = match?.name || service?.name || serviceCode;

    if (Number(dbUser.walletBalance) < price) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });
    }

    await prolongRentOrder(order.providerOrderId, dtype, dcount);

    const extensionMs = dcount * (dtype === "week" ? 7 : 30) * 24 * 60 * 60 * 1000;
    const newExpiresAt = new Date(Math.max(order.expiresAt.getTime(), Date.now()) + extensionMs);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: order.id },
        data: { expiresAt: newExpiresAt },
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
          label: `Rent prolong: ${serviceName} (+${dcount} ${dtype}${dcount > 1 ? "s" : ""})`,
          amount: -price,
          reference: order.id,
        },
      });

      return result;
    });

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error("Failed to prolong rental:", err);
    return NextResponse.json({ error: "Failed to extend rental." }, { status: 502 });
  }
}
