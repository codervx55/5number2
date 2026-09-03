import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { getUsdToNgnRate } from "@/lib/exchange-rate";

/**
 * GET /api/admin/all
 * One call returning the whole admin dashboard: totals, users, orders,
 * transactions. Admin-only. Consolidates what used to be four endpoints so
 * the dashboard loads everything on one page.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  const [
    userCount,
    balanceAgg,
    orderCount,
    ordersToday,
    ordersWeek,
    receivedCount,
    p1Count,
    p2Count,
    purchaseAgg,
    topupAgg,
    refundAgg,
    siteStats,
    users,
    orders,
    txns,
    ngnRate,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.order.count({ where: { status: "received" } }),
    prisma.order.count({ where: { provider: "smspva" } }),
    prisma.order.count({ where: { provider: "5sim" } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "purchase" } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "topup" } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "refund" } }),
    prisma.siteStats.findUnique({ where: { id: 1 } }).catch(() => null),
    prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, walletBalance: true, createdAt: true,
        _count: { select: { orders: true, transactions: true } },
      },
    }),
    prisma.order.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.transaction.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
    getUsdToNgnRate().catch(() => 1700),
  ]);

  const num = (v: any) => Number(v ?? 0);

  return NextResponse.json({
    totals: {
      users: userCount,
      walletBalance: num(balanceAgg._sum.walletBalance),
      orders: orderCount,
      ordersToday,
      ordersWeek,
      received: receivedCount,
      successRate: orderCount > 0 ? Math.round((receivedCount / orderCount) * 100) : 0,
      provider1: p1Count,
      provider2: p2Count,
      revenue: Math.abs(num(purchaseAgg._sum.amount)),
      topups: num(topupAgg._sum.amount),
      refunds: num(refundAgg._sum.amount),
      siteViews: num(siteStats?.totalViews),
      ngnRate: num(ngnRate),
    },
    users: users.map((u) => ({
      email: u.email,
      walletBalance: num(u.walletBalance),
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      txnCount: u._count.transactions,
    })),
    orders: orders.map((o) => ({
      email: o.user.email,
      platform: o.platform,
      country: o.country,
      price: num(o.price),
      status: o.status,
      provider: o.provider === "5sim" ? "Provider 2" : "Provider 1",
      orderType: o.orderType,
      createdAt: o.createdAt,
    })),
    transactions: txns.map((t) => ({
      email: t.user.email,
      type: t.type,
      label: t.label,
      amount: num(t.amount),
      createdAt: t.createdAt,
    })),
  });
}
