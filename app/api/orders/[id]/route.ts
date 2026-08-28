import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { checkSms } from "@/lib/smspva";

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
    const expired = await prisma.order.update({
      where: { id: order.id },
      data: { status: "expired" },
      include: { messages: { orderBy: { receivedAt: "asc" } } },
    });
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

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ order: updated });
}
