import crypto from "crypto";

/**
 * Paystack integration for wallet top-ups.
 *
 * Flow:
 *   1. User picks a USD amount + payment channel on /buy-points
 *   2. POST /api/wallet/topup/paystack/init converts USD->NGN, calls
 *      initializeTransaction(), and redirects the user to Paystack
 *   3. Paystack calls our webhook on success; the webhook credits the wallet
 *
 * IMPORTANT: the webhook is the source of truth for crediting, NOT the
 * browser redirect. A user can close the tab before being redirected back,
 * and bank-transfer/USSD payments often settle after the redirect happens.
 * Crediting on redirect alone would silently lose people's money.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set. Add it to your environment variables.");
  }
  return key;
}

/** Payment channels we offer. Restricting to one sends the user straight
 *  to that method instead of Paystack's full picker. */
export type PaystackChannel = "card" | "bank_transfer" | "ussd";

export const PAYSTACK_CHANNELS: { id: PaystackChannel; label: string; hint: string }[] = [
  { id: "card", label: "Card", hint: "Debit or credit card" },
  { id: "bank_transfer", label: "Bank transfer", hint: "Transfer from your bank app" },
  { id: "ussd", label: "USSD", hint: "Dial a code on your phone" },
];

export interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

/**
 * Creates a Paystack transaction and returns the hosted checkout URL.
 *
 * @param amountNgn  Amount in whole naira (converted to kobo internally -
 *                   Paystack expects the subunit, i.e. naira x 100).
 */
export async function initializeTransaction(params: {
  email: string;
  amountNgn: number;
  reference: string;
  channel: PaystackChannel;
  callbackUrl: string;
  metadata?: Record<string, any>;
}): Promise<InitializeResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      // Paystack takes the amount in kobo, not naira.
      amount: params.amountNgn * 100,
      currency: "NGN",
      reference: params.reference,
      // A single-item channels array makes Paystack open directly on that
      // payment method rather than showing the full chooser.
      channels: [params.channel],
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json?.status) {
    throw new Error(`Paystack initialize failed: ${json?.message ?? res.status}`);
  }

  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
  };
}

/** Server-side verification of a transaction by reference. */
export async function verifyTransaction(reference: string): Promise<{
  status: string;
  amountNgn: number;
  metadata: Record<string, any> | null;
}> {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey()}` }, cache: "no-store" }
  );

  const json = await res.json();
  if (!res.ok || !json?.status) {
    throw new Error(`Paystack verify failed: ${json?.message ?? res.status}`);
  }

  return {
    status: json.data.status,
    amountNgn: Number(json.data.amount) / 100,
    metadata: json.data.metadata ?? null,
  };
}

/**
 * Verifies that a webhook request genuinely came from Paystack.
 *
 * Paystack signs the raw request body with your secret key using HMAC
 * SHA-512 and sends it in the x-paystack-signature header. Without this
 * check, anyone who knows your webhook URL could POST a fake "payment
 * succeeded" event and credit themselves for free.
 *
 * Must be given the RAW body string, not a re-serialized object - JSON
 * key ordering/whitespace would differ and the signature wouldn't match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");

  // Constant-time compare to avoid leaking the signature via timing.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
