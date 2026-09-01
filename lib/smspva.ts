/**
 * Wrapper around SMSPVA's HTTP API.
 *
 * SMSPVA documents FOUR separate API tracks (see docs.smspva.com):
 *   1. Main Activation API - Version 2  <- confirmed, used below for number + sms
 *   2. Main Rental API - Version 1
 *   3. Alternative Activation API
 *   4. Deprecated Activation API - Version 1  <- this file used to be built on this
 *
 * getNumber/checkSms below are on the confirmed V2 REST API:
 *   base:   https://api.smspva.com
 *   auth:   header `apikey: <key>` (NOT a GET param, unlike V1)
 *   GET /activation/number/{country}/{service}
 *     -> { statusCode, data: { orderId, phoneNumber, countryCode, orderExpireIn } }
 *     errors: 405 invalid params, 407 balance too low, 411 low karma/ratelimit,
 *             500 failed to fetch, 501/502 number not found, 503 overload
 *   GET /activation/sms/{orderid}
 *     -> { statusCode, data: { sms, orderId, orderExpireIn } }
 *     errors: 202 not received yet, 405 invalid params, 406 unknown order,
 *             407 balance too low, 410 order closed, 411 low karma, 500/501/503
 *
 * getStock/getPrice below are STILL ON THE DEPRECATED V1 endpoint
 * (priemnik.php?metod=...) - I could not confirm a V2 equivalent path for
 * count/price from the public docs. Verify against your SMSPVA
 * dashboard/API docs (Data List -> Services/Countries, or a "Get Prices"
 * section) and migrate these two once confirmed.
 *
 * Operational rules from the V2 docs worth respecting elsewhere in the
 * codebase:
 *   - If no SMS arrives within 580s, ban the number - after 10 min the
 *     server may reissue it anyway since it holds the request id that long.
 *   - Up to 50 connections/sec allowed.
 *   - Keep at least 4-5s between polls per order (checkSms is currently
 *     polled every 4s in app/api/orders/[id]/route.ts - right at that floor).
 */

const V2_BASE_URL = "https://api.smspva.com";
const V1_BASE_URL = "https://smspva.com/priemnik.php";

function apiKey() {
  const key = process.env.SMSPVA_API_KEY;
  if (!key) {
    throw new Error(
      "SMSPVA_API_KEY is not set. Add it to your environment variables."
    );
  }
  return key;
}

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Retry once on transient network drops (socket resets, "fetch failed")
    // rather than immediately failing - these are usually connection
    // hiccups, not real API errors.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

/** GET request against the V2 REST API. Auth via `apikey` header. */
async function smspvaV2Request(path: string): Promise<any> {
  return withRetry(async () => {
    const res = await fetch(`${V2_BASE_URL}${path}`, {
      headers: { apikey: apiKey() },
      cache: "no-store",
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // fall through with body === null
    }

    if (!res.ok) {
      throw new SmspvaError(res.status, body);
    }

    return body;
  });
}

/** GET request against the deprecated V1 endpoint (still used for stock/price). */
async function smspvaV1Request(params: Record<string, string>): Promise<any> {
  return withRetry(async () => {
    const url = new URL(V1_BASE_URL);
    url.searchParams.set("apikey", apiKey());
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`SMSPVA V1 request failed: ${res.status} ${res.statusText}`);
    }

    // V1 responses are inconsistently JSON vs plain text depending on method.
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  });
}

/** Error carrying the V2 statusCode so callers can branch on it (e.g. 407 = low balance). */
export class SmspvaError extends Error {
  statusCode: number;
  body: any;
  constructor(statusCode: number, body: any) {
    super(`SMSPVA request failed with status ${statusCode}`);
    this.name = "SmspvaError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Available stock for a given service+country pair.
 * TODO: on the deprecated V1 endpoint - confirm/migrate to a V2 equivalent
 * once you find the documented path (check your SMSPVA API docs' "Services"/
 * "Countries" or pricing section).
 */
export async function getStock(serviceCode: string, countryCode: string): Promise<number> {
  const data = await smspvaV1Request({
    metod: "get_count_new",
    service: serviceCode,
    country: countryCode,
  });
  const count = typeof data === "object" ? Number(data.count ?? data.total ?? 0) : Number(data);
  return Number.isFinite(count) ? count : 0;
}

/**
 * Current price (in provider currency) for a service+country pair.
 * TODO: same caveat as getStock - still on the deprecated V1 endpoint.
 */
export async function getPrice(serviceCode: string, countryCode: string): Promise<number> {
  const data = await smspvaV1Request({
    metod: "get_service_price",
    service: serviceCode,
    country: countryCode,
  });
  const price = typeof data === "object" ? Number(data.price ?? data.cost ?? 0) : Number(data);
  return Number.isFinite(price) ? price : 0;
}

/** Fetches prices for one service across every country in a single call. */
export async function getAllPricesForService(
  serviceCode: string
): Promise<Map<string, number> | null> {
  try {
    const data = await smspvaV2Request(
      `/activation/serviceprices/${encodeURIComponent(serviceCode)}`
    );

    if (process.env.SMSPVA_DEBUG === "1") {
      console.log("RAW serviceprices:", JSON.stringify(data).slice(0, 1500));
    }

    // Real shape: data.clist[] = { ccode, cname, opers: [{ opcode, price, count }] }
    // Each country has MANY operators at different prices. We pick the
    // cheapest operator per country. The "Total_XX" operator is an
    // aggregated/most-expensive row, so real named operators usually beat it.
    const list = data?.data?.clist ?? data?.data?.countries ?? data?.data;
    if (!Array.isArray(list) || list.length === 0) return null;

    const out = new Map<string, number>();
    for (const item of list) {
      const code = item?.ccode ?? item?.country ?? item?.Country ?? item?.code;
      if (typeof code !== "string") continue;

      const opers = item?.opers ?? item?.operators ?? [];
      if (!Array.isArray(opers) || opers.length === 0) continue;

      // Cheapest valid price across all operators for this country.
      let cheapest = Infinity;
      for (const op of opers) {
        const p = Number(op?.price ?? op?.cost);
        if (Number.isFinite(p) && p > 0 && p < cheapest) {
          cheapest = p;
        }
      }

      if (Number.isFinite(cheapest) && cheapest !== Infinity) {
        out.set(code.toUpperCase(), cheapest);
      }
    }

    return out.size > 0 ? out : null;
  } catch (err) {
    console.error("Bulk price lookup failed, will fall back:", err);
    return null;
  }
}

/**
 * Fetches available number counts for every country/operator in one call,
 * reduced to a per-country total for the given service.
 */
export async function getAllCountsForService(
  serviceCode: string
): Promise<Map<string, number> | null> {
  try {
    const data = await smspvaV2Request("/activation/countnumbers");

    if (process.env.SMSPVA_DEBUG === "1") {
      console.log("RAW countnumbers:", JSON.stringify(data).slice(0, 1500));
    }

    const list = data?.data;
    if (!Array.isArray(list) || list.length === 0) return null;

    // Rows are per country+operator, so several rows can cover one country;
    // sum them for a country total.
    const out = new Map<string, number>();
    for (const row of list) {
      const country = row?.Country ?? row?.country;
      if (typeof country !== "string") continue;

      const services = row?.Services ?? row?.services;
      if (!Array.isArray(services)) continue;

      for (const s of services) {
        const code = s?.Service ?? s?.service ?? s?.scode;
        if (code !== serviceCode) continue;
        const n = Number(s?.Online ?? s?.online ?? s?.Total ?? s?.total ?? 0);
        if (!Number.isFinite(n)) continue;
        out.set(country.toUpperCase(), (out.get(country.toUpperCase()) ?? 0) + n);
      }
    }

    return out.size > 0 ? out : null;
  } catch (err) {
    console.error("Bulk count lookup failed, will fall back:", err);
    return null;
  }
}

export interface SmspvaNumberResult {
  providerOrderId: string;
  phoneNumber: string;
}

/**
 * Reserves and reveals a real number, via the confirmed V2 endpoint
 * GET /activation/number/{country}/{service}.
 *
 * Only call this at the moment of purchase (after the user's wallet has
 * been confirmed sufficient) - never earlier, so nobody can see a real
 * number without paying for it.
 *
 * countryCode must be uppercase ISO 3166-2 (e.g. "RU") - matches the format
 * already used in lib/smspva-countries.ts.
 */
export async function requestNumber(
  serviceCode: string,
  countryCode: string
): Promise<SmspvaNumberResult> {
  const data = await smspvaV2Request(
    `/activation/number/${encodeURIComponent(countryCode)}/${encodeURIComponent(serviceCode)}`
  );

  const providerOrderId = data?.data?.orderId;
  const phoneNumber = data?.data?.phoneNumber;

  if (!providerOrderId || !phoneNumber) {
    throw new Error("SMSPVA did not return a usable number - out of stock?");
  }

  return { providerOrderId: String(providerOrderId), phoneNumber: String(phoneNumber) };
}

export interface SmspvaSmsResult {
  code: string | null;
  fullText: string | null;
}

/**
 * Polls for an incoming SMS/code on a previously-purchased number, via the
 * confirmed V2 endpoint GET /activation/sms/{orderid}.
 *
 * A 202 status means no SMS yet - treated as "still waiting", not an error.
 */
export async function checkSms(providerOrderId: string): Promise<SmspvaSmsResult> {
  try {
    const data = await smspvaV2Request(
      `/activation/sms/${encodeURIComponent(providerOrderId)}`
    );

    if (process.env.SMSPVA_DEBUG === "1") {
      console.log("RAW sms:", JSON.stringify(data));
    }

    const sms = data?.data?.sms;
    if (!sms) {
      return { code: null, fullText: null };
    }

    // TODO: confirm the exact shape of `sms` from a live response - the docs
    // page I could reach showed `data.sms` as an object without spelling out
    // its inner fields. Adjust the two lines below once you've seen a real
    // payload (likely something like { code, text } or just a string).
    const code =
      typeof sms === "object" ? sms.code ?? null : typeof sms === "string" ? sms : null;
    const fullText = typeof sms === "object" ? sms.text ?? sms.fullText ?? null : null;

    return { code, fullText };
  } catch (err) {
    if (err instanceof SmspvaError && err.statusCode === 202) {
      // SMS not yet received - normal "still waiting" state, not a failure.
      return { code: null, fullText: null };
    }
    throw err;
  }
}