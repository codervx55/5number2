import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creditTopup } from "@/lib/topup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  const rows = await prisma.transaction.findMany({
    where: { type: "topup_pending", createdAt: { gte: since }, reference: { not: null } },
    select: { reference: true },
    take: 50,
  });

  const results: Record<string, string> = {};
  let credited = 0;
  for (const r of rows) {
    try {
      const res = await creditTopup(r.reference!);
      results[r.reference!] = res;
      if (res === "credited") credited++;
    } catch (e) {
      results[r.reference!] = "error";
      console.error("[reconcile]", r.reference, e);
    }
  }

  // Details go to the Render logs; the response stays small for cron-job.org.
  console.log("[reconcile]", JSON.stringify(results));
  return NextResponse.json({ ok: true, checked: rows.length, credited });
}
