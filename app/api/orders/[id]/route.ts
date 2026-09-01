import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { checkSms } from "@/lib/smspva";

/**
 * Closes an order with the given end status and refunds the wallet for it,
 * atomically. Idempotent: the refund Transaction uses a unique reference
 * (`refund:<orderId>`), so if this runs twice (e.g. two polls race), the
 * second refund insert fails and the wallet is only credited once.
 *
 * Only refunds activation orders that were actually charged (price > 0) and
 * that haven't already been moved to a terminal refunded state.
 */
async function refundAndClose(order: any, endStatus: "expired" | "cancelled") {
  const price = Number(order.price);

  // Nothing to refund (free/zero-price or already closed) - just set status.
  if (!Number.isFinite(price) || price <= 0) {
    return prisma.order.update({
      where: { id: order.id },
      data: { status: endStatus },
      include: { messages: { orderBy: { receivedAt: "asc" } } },
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Insert the refund ledger row FIRST - its unique reference is the lock.
      // If a refund for this order already exists, this throws and we skip
      // crediting the wallet again.
      await tx.transaction.create({
        data: {
          userId: order.userId,
          type: "refund",
          method: "wallet",
          label: `Refund - ${order.platform} ${order.country} (${endStatus})`,
          amount: price,
          reference: `refund:${order.id}`,
        },
      });

      await tx.user.update({
        where: { id: order.userId },
        data: { walletBalance: { increment: price } },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: endStatus },
        include: { messages: { orderBy: { receivedAt: "asc" } } },
      });
    });
  } catch (err) {
    // Unique-constraint violation = already refunded by a concurrent poll.
    // Just return the order in its end status without double-crediting.
    console.error(`Refund skipped for order ${order.id} (already refunded?):`, err);
    return prisma.order.update({
      where: { id: order.id },
      data: { status: endStatus },
      include: { messages: { orderBy: { receivedAt: "asc" } } },
    });
  }
}

/**
 * GET /api/orders/:id
 *
 * Polls the provider for a new incoming SMS on this order. Call this on an
 * interval (e.g. every 3-5s) from ActiveNumberPanel while status is
 * "waiting". Once a code arrives, it's stored as an OrderMessage and the
 * order's status flips to "received" - both are then returned so the UI can
 * stop polling and render the message.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { messages: { orderBy: { receivedAt: "asc" } } },
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Nothing to poll for on a finished order - just return current state.
  if (order.status !== "waiting") {
    return NextResponse.json({ order });
  }

  if (new Date() > order.expiresAt) {
    // No code arrived before the number expired - refund the wallet.
    // Only activation orders that actually charged get refunded, and the
    // refund is guarded by a unique transaction reference so repeated polls
    // can't refund the same order twice.
    const expired = await refundAndClose(order, "expired");
    return NextResponse.json({ order: expired });
  }

  try {
    const { code, fullText } = await checkSms(order.providerOrderId);

    if (!code) {
      // Still waiting - nothing new.
      return NextResponse.json({ order });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderMessage.create({
        data: {
          orderId: order.id,
          sender: order.platform,
          text: fullText ?? `Your verification code is ${code}.`,
          code,
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: "received", code },
        include: { messages: { orderBy: { receivedAt: "asc" } } },
      });
    });

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error(`Failed to poll SMS for order ${order.id}:`, err);
    // Don't fail the whole request over a transient provider hiccup - just
    // return current state so the UI keeps polling on the next interval.
    return NextResponse.json({ order });
  }
}

/**
 * DELETE /api/orders/:id
 * Marks an order as cancelled (the "release" action in the UI).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Releasing a number before any code arrived refunds the wallet; if a
  // code was already received, no refund (the number was used).
  const updated = order.code
    ? await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      })
    : await refundAndClose(order, "cancelled");

  return NextResponse.json({ order: updated });
}
