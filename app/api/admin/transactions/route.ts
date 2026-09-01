import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";

/**
 * GET /api/admin/transactions?limit=100&type=
 * Recent transactions (topup/purchase/refund) with optional type filter.
 * Admin-only.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 100), 500);
  const type = sp.get("type") || undefined;

  const txns = await prisma.transaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    where: type ? { type } : {},
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    transactions: txns.map((t) => ({
      id: t.id,
      email: t.user.email,
      type: t.type,
      method: t.method,
      label: t.label,
      amount: Number(t.amount),
      createdAt: t.createdAt,
    })),
  });
}
