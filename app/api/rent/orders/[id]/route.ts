import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { deleteRentOrder, getRentSms } from "@/lib/smspva-rental";

/**
 * GET /api/rent/orders/[id]
 * Polls SMSPVA for any SMS received since we last checked and stores new
 * ones as OrderMessage rows, then returns the order with its full message
 * history. Rentals can receive many messages over their lifetime (not just
 * one code like Activation), so this appends rather than replacing.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: user.id, orderType: "rent" },
    include: { messages: { orderBy: { receivedAt: "asc" } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "active") {
    return NextResponse.json({ order });
  }

  try {
    const messages = await getRentSms(order.providerOrderId);
    const alreadyStoredCount = order.messages.length;

    // The provider returns the full history each time, not just new
    // messages - only persist ones beyond what we've already stored.
    // TODO: this assumes stable ordering across calls; verify against a
    // live response and switch to a dedupe-by-content check if not.
    const newMessages = messages.slice(alreadyStoredCount);

    if (newMessages.length > 0) {
      await prisma.orderMessage.createMany({
        data: newMessages.map((m) => ({
          orderId: order.id,
          sender: m.sender || "SMSPVA",
          text: m.text,
          code: null,
        })),
      });
    }

    const refreshed = await prisma.order.findUnique({
      where: { id: order.id },
      include: { messages: { orderBy: { receivedAt: "asc" } } },
    });

    return NextResponse.json({ order: refreshed });
  } catch (err) {
    console.error("Failed to poll rental SMS:", err);
    // Return what we have rather than failing the whole request - a
    // transient provider hiccup shouldn't blank out the panel.
    return NextResponse.json({ order });
  }
}

/**
 * DELETE /api/rent/orders/[id]
 * Cancels the rental with the provider and marks it cancelled locally.
 * No refund is issued here - rental time already elapsed isn't
 * SMSPVA-refundable; adjust if their terms say otherwise.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: user.id, orderType: "rent" },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  try {
    await deleteRentOrder(order.providerOrderId);
  } catch (err) {
    console.error("Failed to cancel rental with provider:", err);
    // Still mark it cancelled locally so it stops showing as active -
    // better than leaving the user stuck with an order they can't dismiss.
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
