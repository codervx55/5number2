import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

export type CreditResult = "credited" | "already" | "pending" | "unknown" | "no_amount";

export async function creditTopup(reference: string): Promise<CreditResult> {
  const row = await prisma.transaction.findUnique({ where: { reference } });
  if (!row) return "unknown";
  if (row.type !== "topup_pending") return "already";

  const verified = await verifyTransaction(reference);
  if (verified.status !== "success") return "pending";

  const amountUsd = Number(verified.metadata?.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return "no_amount";

  const credited = await prisma.$transaction(async (tx) => {
    const flipped = await tx.transaction.updateMany({
      where: { reference, type: "topup_pending" },
      data: { type: "topup", amount: amountUsd, label: `Wallet top-up: $${amountUsd.toFixed(2)}` },
    });
    if (flipped.count === 0) return false; // someone else credited it first
    await tx.user.update({
      where: { id: row.userId },
      data: { walletBalance: { increment: amountUsd } },
    });
    return true;
  });

  return credited ? "credited" : "already";
}
