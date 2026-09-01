import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { initializeTransaction, PaystackChannel } from "@/lib/paystack";
import { usdToNgn } from "@/lib/exchange-rate";

const MIN_USD = 1;

const VALID_CHANNELS: PaystackChannel[] = ["card", "bank_transfer", "ussd"];

/**
 * POST /api/wallet/topup/paystack/init
 * Body: { amountUsd: number, channel: "card" | "bank_transfer" | "ussd" }
 *
 * Creates a pending Transaction row and a Paystack transaction, then
 * returns the hosted checkout URL for the client to redirect to.
 *
 * The wallet is NOT credited here - that happens in the webhook once
 * Paystack confirms the money actually arrived.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const amountUsd = Number(body?.amountUsd);
  const channel = body?.channel as PaystackChannel | undefined;

  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD) {
    return NextResponse.json(
      { error: `Minimum top-up is $${MIN_USD.toFixed(2)}.` },
      { status: 400 }
    );
  }
  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  try {
    // Round to cents so the credited amount can't have sub-cent precision
    // that the Decimal(10,2) column would silently truncate.
    const usd = Number(amountUsd.toFixed(2));
    const amountNgn = await usdToNgn(usd);

    const reference = `5n_${crypto.randomBytes(12).toString("hex")}`;

    // Record the intent BEFORE sending the user to Paystack, so a payment
    // can always be traced back to a user even if something fails later.
    // amount 0 + type "topup_pending" means it doesn't affect any balance
    // totals until the webhook flips it to a real credit.
    await prisma.transaction.create({
      data: {
        userId: dbUser.id,
        type: "topup_pending",
        method: `paystack_${channel}`,
        label: `Wallet top-up: $${usd.toFixed(2)}`,
        amount: 0,
        reference,
      },
    });

    // IMPORTANT: on Render (behind their proxy) req.nextUrl.origin resolves to
    // the internal http://localhost:10000, which Paystack would then redirect
    // the user back to after payment - a dead page. Use the public site URL
    // instead: NEXT_PUBLIC_SITE_URL if set, else the request origin as a
    // fallback for local dev.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    const { authorizationUrl } = await initializeTransaction({
      email: dbUser.email,
      amountNgn,
      reference,
      channel,
      callbackUrl: `${origin}/buy-points?ref=${reference}`,
      // The USD figure is carried in metadata so the webhook credits
      // exactly what the user asked for, rather than converting the naira
      // amount back at a possibly-different rate.
      metadata: { userId: dbUser.id, amountUsd: usd },
    });

    return NextResponse.json({ authorizationUrl, reference, amountNgn });
  } catch (err) {
    console.error("Paystack init failed:", err);
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }
}
