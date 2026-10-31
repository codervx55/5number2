import { NextResponse } from "next/server";
import { getUsdToNgnRate } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

/** GET /api/wallet/rate - current USD->NGN rate for the deposit page preview. */
export async function GET() {
  const rate = await getUsdToNgnRate();
  return NextResponse.json({ rate });
}
