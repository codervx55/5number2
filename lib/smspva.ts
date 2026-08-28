/**
 * Thin wrapper around SMSPVA's HTTP API.
 *
 * IMPORTANT: verify these exact endpoint paths and param names against the
 * current SMSPVA API docs / your account dashboard before going live - the
 * method names below (get_count_new, get_service_price, get_number,
 * get_sms) come from SMSPVA's documented API but providers do change
 * params/response shapes over time, and your account may be on a specific
 * API version.
 *
 * All functions throw on unexpected shapes so calling code can decide how
 * to surface the failure (e.g. "out of stock" vs "provider error").
 */

const SMSPVA_BASE_URL = "https://smspva.com/priemnik.php";

function apiKey() {
  const key = process.env.SMSPVA_API_KEY;
  if (!key) {
    throw new Error(
      "SMSPVA_API_KEY is not set. Add it to your environment variables."
    );
  }
  return key;
}

async function smspvaRequest(params: Record<string, string>, attempt = 1): Promise<any> {
  const url = new URL(SMSPVA_BASE_URL);
  url.searchParams.set("apikey", apiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`SMSPVA request failed: ${res.status} ${res.statusText}`);
    }

    // SMSPVA's responses are inconsistently JSON vs plain text depending on
    // method - try JSON first, fall back to raw text.
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (err) {
    // Retry once on transient network drops (socket resets, "fetch failed")
    // rather than immediately failing - these are usually connection
    // hiccups, not real API errors.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return smspvaRequest(params, attempt + 1);
    }
    throw err;
  }
}

/** Available stock for a given service+country pair. */
export async function getStock(serviceCode: string, countryCode: string): Promise<number> {
  const data = await smspvaRequest({
    metod: "get_count_new",
    service: serviceCode,
    country: countryCode,
  });
  const count = typeof data === "object" ? Number(data.count ?? data.total ?? 0) : Number(data);
  return Number.isFinite(count) ? count : 0;
}

/** Current price (in provider currency) for a service+country pair. */
export async function getPrice(serviceCode: string, countryCode: string): Promise<number> {
  const data = await smspvaRequest({
    metod: "get_service_price",
    service: serviceCode,
    country: countryCode,
  });
  const price = typeof data === "object" ? Number(data.price ?? data.cost ?? 0) : Number(data);
  return Number.isFinite(price) ? price : 0;
}

export interface SmspvaNumberResult {
  providerOrderId: string;
  phoneNumber: string;
}

/**
 * Reserves and reveals a real number. Only call this at the moment of
 * purchase (after the user's wallet has been confirmed sufficient) - never
 * earlier, so nobody can see a real number without paying for it.
 */
export async function requestNumber(
  serviceCode: string,
  countryCode: string
): Promise<SmspvaNumberResult> {
  const data = await smspvaRequest({
    metod: "get_number",
    service: serviceCode,
    country: countryCode,
  });

  // TODO: confirm actual response field names from SMSPVA docs/dashboard.
  const providerOrderId = data?.id ?? data?.order_id;
  const phoneNumber = data?.number ?? data?.phone;

  if (!providerOrderId || !phoneNumber) {
    throw new Error("SMSPVA did not return a usable number - out of stock?");
  }

  return { providerOrderId: String(providerOrderId), phoneNumber: String(phoneNumber) };
}

export interface SmspvaSmsResult {
  code: string | null;
  fullText: string | null;
}

/** Polls for an incoming SMS/code on a previously-purchased number. */
export async function checkSms(providerOrderId: string): Promise<SmspvaSmsResult> {
  const data = await smspvaRequest({
    metod: "get_sms",
    id: providerOrderId,
  });

  // TODO: confirm actual response shape - SMSPVA typically returns a
  // "STATUS_WAIT_CODE" style string until a message arrives.
  if (!data || data === "STATUS_WAIT_CODE" || data?.status === "waiting") {
    return { code: null, fullText: null };
  }

  const code = data?.code ?? null;
  const fullText = data?.text ?? data?.sms ?? null;
  return { code, fullText };
}
