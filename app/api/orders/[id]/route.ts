import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { checkSms } from "@/lib/smspva";
import { checkFivesimSms, cancelFivesimOrder } from "@/lib/fivesim";

/**
 * Closes an order with the given end status and refunds the wallet for it,
 * atomically. Idempotent via a unique refund reference (`refund:<orderId>`),
 * so racing polls can't refund twice. For 5sim orders it also cancels the
 * number at 5sim (best-effort) so your provider balance is refunded too.
 */
async function refundAndClose(order: any, endStatus: "expired" | "cancelled") {
  // Best-effort provider-side cancel (only 5sim needs/handles this here).
  if (order.provider === "5sim" && order.providerOrderId) {
    await cancelFivesimOrder(order.providerOrderId);
  }

  const price = Number(order.price);
  if (!Number.isFinite(price) || price <= 0) {
    return prisma.order.update({
      where: { id: order.id },
      data: { status: endStatus },
      include: { messages: { orderBy: { receivedAt: "asc" } } },
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
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
 * Polls the provider (SMSPVA or 5sim) for a new incoming SMS on this order.
 * Once a code arrives it's stored and the order flips to "received". If the
 * number expires with no code, the wallet is refunded.
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

  if (order.status !== "waiting") {
    return NextResponse.json({ order });
  }

  if (new Date() > order.expiresAt) {
    // No code before expiry - refund the wallet.
    const expired = await refundAndClose(order, "expired");
    return NextResponse.json({ order: expired });
  }

  try {
    const { code, fullText } =
      order.provider === "5sim"
        ? await checkFivesimSms(order.providerOrderId)
        : await checkSms(order.providerOrderId);

    if (!code) {
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
    return NextResponse.json({ order });
  }
}

/**
 * DELETE /api/orders/:id
 * Releases a number. If no code has arrived yet, refunds the wallet (and
 * cancels at the provider). If a code was already received, no refund.
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

  const updated = order.code
    ? await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      })
    : await refundAndClose(order, "cancelled");

  return NextResponse.json({ order: updated });
}
