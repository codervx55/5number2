import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * GET /api/wallet/topup/status?ref=...
 *
 * After Paystack redirects the user back, the page polls this to find out
 * whether the webhook has credited the payment yet.
 *
 * Deliberately read-only: it reports what the webhook has done, it never
 * credits anything itself. Card payments are usually credited within
 * seconds; bank transfer and USSD can take longer, which is why the client
 * polls rather than checking once.
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

  return NextResponse.json({
    status: txn.type === "topup" ? "credited" : "pending",
    amount: Number(txn.amount),
  });
}
