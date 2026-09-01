import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * GET /api/me/transactions?limit=100
 * The logged-in user's own transaction history: deposits (topups),
 * purchases, and refunds. Users only ever see their own rows.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 300);

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Totals for the summary cards.
  const totalDeposited = txns
    .filter((t) => t.type === "topup")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSpent = txns
    .filter((t) => t.type === "purchase")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const totalRefunded = txns
    .filter((t) => t.type === "refund")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return NextResponse.json({
    totals: { deposited: totalDeposited, spent: totalSpent, refunded: totalRefunded },
    transactions: txns.map((t) => ({
      id: t.id,
      type: t.type,
      method: t.method,
      label: t.label,
      amount: Number(t.amount),
      createdAt: t.createdAt,
    })),
  });
}
