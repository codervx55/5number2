import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";

/**
 * GET /api/admin/users?limit=100
 * User list with balance, signup, and order count. Admin-only.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 500);

  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      walletBalance: true,
      createdAt: true,
      _count: { select: { orders: true, transactions: true } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      walletBalance: Number(u.walletBalance),
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      transactionCount: u._count.transactions,
    })),
  });
}
