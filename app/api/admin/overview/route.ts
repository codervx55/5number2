import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";

/**
 * GET /api/admin/overview
 * Aggregate business metrics for the admin dashboard. Admin-only.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6); // last 7 days incl. today

  const [
    userCount,
    balanceAgg,
    orderCount,
    ordersToday,
    ordersWeek,
    receivedCount,
    provider1Count,
    provider2Count,
    purchaseAgg,
    topupAgg,
    refundAgg,
    siteStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.order.count({ where: { status: "received" } }),
    prisma.order.count({ where: { provider: "smspva" } }),
    prisma.order.count({ where: { provider: "5sim" } }),
    // purchases are stored as negative amounts; sum them and negate for revenue
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "purchase" } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "topup" } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "refund" } }),
    prisma.siteStats.findUnique({ where: { id: 1 } }).catch(() => null),
  ]);

  const num = (v: any) => Number(v ?? 0);

  return NextResponse.json({
    users: userCount,
    totalWalletBalance: num(balanceAgg._sum.walletBalance),
    orders: {
      total: orderCount,
      today: ordersToday,
      week: ordersWeek,
      received: receivedCount,
      successRate: orderCount > 0 ? Math.round((receivedCount / orderCount) * 100) : 0,
    },
    providerSplit: {
      provider1: provider1Count, // SMSPVA
      provider2: provider2Count, // 5sim
    },
    money: {
      revenue: Math.abs(num(purchaseAgg._sum.amount)), // spend on numbers
      topups: num(topupAgg._sum.amount),
      refunds: num(refundAgg._sum.amount),
    },
    siteViews: num(siteStats?.totalViews),
  });
}
