import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creditTopup } from "@/lib/topup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  const rows = await prisma.transaction.findMany({
    where: { type: "topup_pending", createdAt: { gte: since }, reference: { not: null } },
    select: { reference: true },
    take: 50,
  });
  const out: Record<string, string> = {};
  for (const r of rows) {
    try { out[r.reference!] = await creditTopup(r.reference!); }
    catch (e) { out[r.reference!] = "error"; console.error("[reconcile]", r.reference, e); }
  }
  console.log("[reconcile]", out);
  return NextResponse.json(out);
}
