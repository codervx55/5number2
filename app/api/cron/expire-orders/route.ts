import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelFivesimOrder } from "@/lib/fivesim";

/**
 * GET /api/cron/expire-orders
 *
 * Background sweep: finds activation orders that have EXPIRED while still
 * "waiting" (no code ever arrived) and refunds the wallet for each, then
 * marks them "expired". This is what guarantees money comes back for numbers
 * the user bought but never got a code on - even if they navigated away and
 * nothing was polling that order.
 *
 * Idempotent: each refund inserts a Transaction with a unique reference
 * (`refund:<orderId>`), so re-running the sweep can never double-refund.
 *
 * Meant to be called on a schedule (e.g. your existing cron-job.org ping,
 * pointed at this URL every few minutes). Optionally protect it with
 * CRON_SECRET: if that env var is set, the caller must pass ?key=<secret>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const key = req.nextUrl.searchParams.get("key");
    if (key !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date();

  // Expired activation orders still marked waiting = no code, needs refund.
  const stale = await prisma.order.findMany({
    where: {
      status: "waiting",
      orderType: "activation",
      expiresAt: { lt: now },
    },
    take: 200, // cap per run; the next run catches any remainder
  });

  let refunded = 0;
  let skipped = 0;

  for (const order of stale) {
    // Best-effort provider cancel for 5sim (frees the number / provider refund).
    if (order.provider === "5sim" && order.providerOrderId) {
      await cancelFivesimOrder(order.providerOrderId);
    }

    const price = Number(order.price);
    if (!Number.isFinite(price) || price <= 0) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "expired" } });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Unique reference is the lock against double-refund.
        await tx.transaction.create({
          data: {
            userId: order.userId,
            type: "refund",
            method: "wallet",
            label: `Refund - ${order.platform} ${order.country} (expired, no code)`,
            amount: price,
            reference: `refund:${order.id}`,
          },
        });
        await tx.user.update({
          where: { id: order.userId },
          data: { walletBalance: { increment: price } },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: "expired" },
        });
      });
      refunded++;
    } catch (err) {
      // Already refunded (unique constraint) - just make sure status is set.
      await prisma.order
        .update({ where: { id: order.id }, data: { status: "expired" } })
        .catch(() => {});
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, scanned: stale.length, refunded, skipped });
}
