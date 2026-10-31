import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { creditTopup } from "@/lib/topup";

/**
 * GET /api/wallet/topup/status?ref=...
 *
 * After Paystack redirects the user back, the page polls this. If the
 * payment is still pending, it asks Paystack directly and credits the
 * wallet (idempotent - safe alongside the webhook and the cron).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("ref");
  if (!reference) {
    return NextResponse.json({ error: "Missing 'ref'." }, { status: 400 });
  }

  const txn = await prisma.transaction.findUnique({ where: { reference } });

  // Scope to the requesting user so one user can't probe another's
  // payment references.
  if (!txn || txn.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (txn.type === "topup_pending") {
    try {
      await creditTopup(reference);
    } catch (e) {
      console.error("[status] credit failed", e);
    }
    const fresh = await prisma.transaction.findUnique({ where: { reference } });
    if (fresh) {
      return NextResponse.json({
        status: fresh.type === "topup" ? "credited" : "pending",
        amount: Number(fresh.amount),
      });
    }
  }

  return NextResponse.json({
    status: txn.type === "topup" ? "credited" : "pending",
    amount: Number(txn.amount),
  });
}
