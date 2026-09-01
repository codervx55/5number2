/**
 * 5sim.net provider module (activation only).
 *
 * This is a SELF-CONTAINED provider client, deliberately mirroring the shape
 * of the functions in lib/smspva.ts so the buy/listing/polling routes can
 * treat both providers the same way once wired up:
 *
 *   getFivesimPricesForService(product)  -> Map<countryName, { price, operator }>
 *   buyFivesimNumber(country, product)   -> { providerOrderId, phoneNumber, operator }
 *   checkFivesimSms(providerOrderId)     -> { code, fullText }
 *   cancelFivesimOrder(providerOrderId)  -> void   (used for refunds/release)
 *
 * API basics (confirmed from 5sim.net/docs):
 *   base:   https://5sim.net/v1
 *   auth:   Authorization: Bearer <API_KEY>   (NOT a query param)
 *   prices: GET /guest/prices?product={product}
 *           -> { product: { country: { operator: { cost, count, rate } } } }
 *   buy:    GET /user/buy/activation/{country}/{operator}/{product}
 *           -> { id, phone, operator, product, price, status, expires, sms:[] }
 *   check:  GET /user/check/{id}
 *           -> { id, ..., sms: [{ code, text, ... }] }
 *   cancel: GET /user/cancel/{id}
 *
 * Unlike SMSPVA's V2 activation API, 5sim's buy endpoint DOES take an
 * operator, so we can price off the cheapest in-stock operator AND buy that
 * exact operator - display and charge always match, no drift.
 *
 * NOTE: country/product names here are 5sim's own slugs (e.g. "england",
 * "usa", "whatsapp"), NOT SMSPVA codes or ISO codes. The mapping between
 * 5number's internal codes and these slugs lives in a separate map module
 * (added when this is wired into the listing/buy routes).
 */

const FIVESIM_BASE_URL = "https://5sim.net/v1";

function apiKey(): string {
  const key = process.env.FIVESIM_API_KEY;
  if (!key) {
    throw new Error("FIVESIM_API_KEY is not set. Add it to your environment variables.");
  }
  return key;
}

export class FivesimError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "FivesimError";
    this.statusCode = statusCode;
  }
}

/**
 * Low-level request helper. 5sim uses Bearer auth and returns JSON for most
 * endpoints; a few (buy/check) can return a bare string like "no free phones"
 * on failure, so we defensively parse and surface those as errors.
 */
async function fivesimRequest(path: string, attempt = 1): Promise<any> {
  const url = `${FIVESIM_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();

    // 5sim returns plain-text errors on some failures (e.g. "no free phones",
    // "not enough user balance"). Try JSON first, fall back to text.
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    if (!res.ok) {
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      throw new FivesimError(`5sim request failed: ${res.status} ${msg}`, res.status);
    }

    // A 200 with a plain-text body is also an error signal from 5sim
    // (e.g. "no free phones" comes back 200 in some cases).
    if (typeof body === "string") {
      throw new FivesimError(`5sim returned: ${body}`, res.status);
    }

    return body;
  } catch (err) {
    if (err instanceof FivesimError) throw err;
    // Retry once on transient network failure, same pattern as lib/smspva.ts.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return fivesimRequest(path, attempt + 1);
    }
    throw err;
  }
}

export interface FivesimCountryPrice {
  /** Cheapest in-stock operator's price, in 5sim's provider currency (USD). */
  price: number;
  /** The operator slug to pass to the buy endpoint for that price. */
  operator: string;
  /** Available count for the chosen operator. */
  count: number;
}

/**
 * Prices + stock for one product across every country, keyed by 5sim country
 * slug. For each country we pick the CHEAPEST operator that actually has
 * stock (count > 0) - and we return that operator so the buy call reserves
 * the exact same one we priced (no display-vs-charge drift, since 5sim's buy
 * endpoint accepts the operator).
 *
 * Response shape: { [product]: { [country]: { [operator]: { cost, count } } } }
 */
export async function getFivesimPricesForService(
  product: string
): Promise<Map<string, FivesimCountryPrice>> {
  const data = await fivesimRequest(
    `/guest/prices?product=${encodeURIComponent(product)}`
  );

  if (process.env.FIVESIM_DEBUG === "1") {
    console.log("RAW 5sim prices:", JSON.stringify(data).slice(0, 1500));
  }

  const byProduct = data?.[product];
  const out = new Map<string, FivesimCountryPrice>();
  if (!byProduct || typeof byProduct !== "object") return out;

  for (const [country, operators] of Object.entries<any>(byProduct)) {
    if (!operators || typeof operators !== "object") continue;

    let best: FivesimCountryPrice | null = null;
    for (const [operator, info] of Object.entries<any>(operators)) {
      const price = Number(info?.cost);
      const count = Number(info?.count ?? 0);
      // Only consider operators with real stock and a valid price.
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(count) || count <= 0) continue;

      if (best === null || price < best.price) {
        best = { price, operator, count };
      }
    }

    if (best) out.set(country, best);
  }

  return out;
}

export interface FivesimBuyResult {
  providerOrderId: string;
  phoneNumber: string;
  operator: string;
}

/**
 * Buys one activation number for a country/operator/product on 5sim.
 * Pass the operator returned by getFivesimPricesForService so the reserved
 * number matches the price shown. Use "any" only if you deliberately want
 * 5sim to pick.
 */
export async function buyFivesimNumber(
  country: string,
  product: string,
  operator = "any"
): Promise<FivesimBuyResult> {
  const data = await fivesimRequest(
    `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(
      operator
    )}/${encodeURIComponent(product)}`
  );

  const providerOrderId = data?.id;
  const phoneNumber = data?.phone;
  if (providerOrderId === undefined || !phoneNumber) {
    throw new FivesimError("5sim did not return a usable number - out of stock?");
  }

  return {
    providerOrderId: String(providerOrderId),
    phoneNumber: String(phoneNumber),
    operator: String(data?.operator ?? operator),
  };
}

export interface FivesimSmsResult {
  code: string | null;
  fullText: string | null;
}

/**
 * Polls a 5sim order for the latest SMS. 5sim returns the whole order with an
 * `sms` array; the newest message's `code` is the activation code. An order
 * still waiting simply has an empty sms array - treated as "no code yet",
 * not an error.
 */
export async function checkFivesimSms(
  providerOrderId: string
): Promise<FivesimSmsResult> {
  const data = await fivesimRequest(
    `/user/check/${encodeURIComponent(providerOrderId)}`
  );

  if (process.env.FIVESIM_DEBUG === "1") {
    console.log("RAW 5sim check:", JSON.stringify(data).slice(0, 1000));
  }

  const smsList = Array.isArray(data?.sms) ? data.sms : [];
  if (smsList.length === 0) {
    return { code: null, fullText: null };
  }

  // Latest message is the most recent code.
  const latest = smsList[smsList.length - 1];
  const code = latest?.code ? String(latest.code) : null;
  const fullText = latest?.text ? String(latest.text) : null;
  return { code, fullText };
}

/**
 * Cancels a 5sim order (used when refunding/releasing a number that got no
 * code). 5sim refunds your provider balance on a cancel before any SMS.
 * Best-effort: a failure here shouldn't block the user-facing refund, which
 * is handled separately on the wallet side.
 */
export async function cancelFivesimOrder(providerOrderId: string): Promise<void> {
  try {
    await fivesimRequest(`/user/cancel/${encodeURIComponent(providerOrderId)}`);
  } catch (err) {
    console.error(`5sim cancel failed for order ${providerOrderId}:`, err);
  }
}
