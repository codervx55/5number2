/**
 * Live USD -> NGN exchange rate, used to convert a user's dollar top-up
 * into the naira amount Paystack actually charges.
 *
 * Source: exchangerate-api.com's free "open" endpoint (no API key needed).
 * Cached in-process for an hour - FX rates don't move meaningfully minute
 * to minute, and this avoids an extra network round-trip on every checkout.
 *
 * NOTE: we deliberately do NOT add a markup/buffer here. The user is
 * charged the true naira equivalent of the dollars they asked for, and
 * Paystack's transaction fee comes out of our margin rather than out of
 * the user's balance. If margins ever get tight, a buffer would go here.
 */

const RATE_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cached: { rate: number; expiresAt: number } | null = null;

/**
 * Fallback used only if the rate API is unreachable. Deliberately
 * conservative (higher than the real rate) so that an outage can't cause
 * us to undercharge - better to charge slightly too much and refund than
 * to sell dollars below cost.
 *
 * TODO: revisit this number periodically - a stale fallback that's too low
 * is a silent way to lose money during an API outage.
 */
const FALLBACK_USD_NGN = 1700;

export async function getUsdToNgnRate(): Promise<number> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rate;
  }

  try {
    const res = await fetch(RATE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Rate API returned ${res.status}`);
    const json = await res.json();
    const rate = Number(json?.rates?.NGN);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Rate API returned an unusable NGN rate");
    }

    cached = { rate, expiresAt: Date.now() + CACHE_TTL_MS };
    return rate;
  } catch (err) {
    console.error("Failed to fetch USD->NGN rate, using fallback:", err);
    return FALLBACK_USD_NGN;
  }
}

/** Converts a USD amount to whole naira (rounded up to the nearest naira). */
export async function usdToNgn(usd: number): Promise<number> {
  const rate = await getUsdToNgnRate();
  return Math.ceil(usd * rate);
}
