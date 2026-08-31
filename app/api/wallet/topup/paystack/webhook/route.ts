import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";

/**
 * POST /api/wallet/topup/paystack/webhook
 *
 * Paystack calls this when a payment completes. This is the ONLY place the
 * wallet gets credited for a top-up - never the browser redirect, since a
 * user can close the tab and bank-transfer/USSD payments often settle
 * after the redirect has already happened.
 *
 * Three safety properties this route must keep:
 *
 *  1. AUTHENTICITY - the request is HMAC-verified against our secret key.
 *     Without it, anyone knowing the URL could POST a fake success event.
 *
 *  2. IDEMPOTENCY - Paystack retries webhooks, and may deliver the same
 *     event more than once. Crediting is keyed off the unique `reference`
 *     column, so a repeat delivery can't double-credit.
 *
 *  3. INDEPENDENT VERIFICATION - we re-fetch the transaction from
 *     Paystack's API rather than trusting the amount in the payload alone.
 */
export async function POST(req: NextRequest) {
  // Must read the RAW body - re-serializing parsed JSON would change
  // whitespace/key order and break the signature check.
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Rejected Paystack webhook with bad signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  // We only care about successful charges. Everything else is acknowledged
  // with 200 so Paystack stops retrying it.
  if (event?.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = event?.data?.reference as string | undefined;
  if (!reference) {
    return NextResponse.json({ received: true });
  }

  try {
    const pending = await prisma.transaction.findUnique({ where: { reference } });

    // Unknown reference - not one of ours (or from another environment).
    if (!pending) {
      console.warn(`Paystack webhook for unknown reference: ${reference}`);
      return NextResponse.json({ received: true });
    }

    // Already processed - this is a retry. Acknowledge without crediting.
    if (pending.type !== "topup_pending") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // Re-verify against Paystack's API rather than trusting the payload.
    const verified = await verifyTransaction(reference);
    if (verified.status !== "success") {
      console.warn(`Paystack reference ${reference} is not successful: ${verified.status}`);
      return NextResponse.json({ received: true });
    }

    // Credit the USD amount the user originally asked for, carried in
    // metadata - NOT a naira->USD reconversion, which could differ if the
    // rate moved between checkout and settlement.
    const amountUsd = Number(verified.metadata?.amountUsd ?? event?.data?.metadata?.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      console.error(`Paystack reference ${reference} has no usable amountUsd in metadata`);
      return NextResponse.json({ received: true });
    }

    await prisma.$transaction(async (tx) => {
      // Flip the pending row to a real credit. Doing this inside the same
      // transaction as the balance update means we can never credit the
      // balance without also marking the row as processed.
      await tx.transaction.update({
        where: { reference },
        data: {
          type: "topup",
          amount: amountUsd,
          label: `Wallet top-up: $${amountUsd.toFixed(2)}`,
        },
      });

      await tx.user.update({
        where: { id: pending.userId },
        data: { walletBalance: { increment: amountUsd } },
      });
    });

    return NextResponse.json({ received: true, credited: true });
  } catch (err) {
    console.error("Paystack webhook processing failed:", err);
    // Return 500 so Paystack retries - better than silently dropping a
    // real payment.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
