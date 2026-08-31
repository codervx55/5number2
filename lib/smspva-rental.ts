/**
 * Wrapper around SMSPVA's Rental API (v1) - confirmed from docs.smspva.com's
 * "Rental service API. v1 [ACTUAL]" section. This is a SEPARATE API from the
 * Activation one in lib/smspva.ts:
 *
 *   base:   https://smspva.com/api/rent.php
 *   auth:   apikey passed as a QUERY PARAM (not a header, unlike Activation V2)
 *   method: every request needs a `method=...` query param naming the action
 *
 * Confirmed methods used below:
 *   method=create               - buy a new rental number for one service
 *   method=getdataWithProviders - available services/prices/operators for a
 *                                 country + duration (used for pricing/stock
 *                                 before letting someone buy)
 *   method=orders               - list this account's active rental orders
 *   method=sms                  - get all SMS received on a rental order
 *   method=prolong               - extend an existing order by week/month
 *   method=delete                - cancel/remove a rental order
 *
 * NOT yet wired here (documented but unused by this app so far):
 *   create_multi, add_service_to_order, activate, prolong_max,
 *   get_rent_history, restore_user_precalc, restore_user, getcountries,
 *   getdata, getcount, get_count_multi, get_default_services,
 *   get_country_by_service, get_days_canada_paypal, get_min_paypal_days,
 *   getCountWithProviders.
 *
 * All responses share the shape { status: 1 | 0, data?: ..., msg?: string }
 * - status 0 means failure, with `msg` holding the reason.
 */

const RENT_BASE_URL = "https://smspva.com/api/rent.php";

function apiKey() {
  const key = process.env.SMSPVA_API_KEY;
  if (!key) {
    throw new Error("SMSPVA_API_KEY is not set. Add it to your environment variables.");
  }
  return key;
}

export class SmspvaRentError extends Error {
  msg?: string;
  constructor(msg?: string) {
    super(msg ? `SMSPVA rental request failed: ${msg}` : "SMSPVA rental request failed");
    this.name = "SmspvaRentError";
    this.msg = msg;
  }
}

async function rentRequest(params: Record<string, string | number>, attempt = 1): Promise<any> {
  const url = new URL(RENT_BASE_URL);
  url.searchParams.set("apikey", apiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`SMSPVA rental request failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (json?.status === 0 || json?.status === "0") {
      throw new SmspvaRentError(json?.msg);
    }
    return json;
  } catch (err) {
    if (err instanceof SmspvaRentError) throw err;
    // Retry once on transient network drops, same pattern as lib/smspva.ts.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return rentRequest(params, attempt + 1);
    }
    throw err;
  }
}

export type RentDurationType = "week" | "month";

export interface RentServicePricing {
  serviceCode: string;
  name: string;
  pricePerDay: number;
  totalCount: number;
  imgPath: string | null;
  available: boolean;
}

/**
 * Pricing + availability for every service the Rental API offers in a given
 * country/duration.
 *
 * Confirmed response shape (verified against a live AR response):
 *   data.services[] = {
 *     name: "1xbet",
 *     service: "opt77",          // service code
 *     price_day: 0.5,            // PRICE PER DAY, not per period
 *     img: "images/ico/opt77_....png",   // relative to smspva.com/templates/New_Design_Multilang/
 *     procent_days, procent, day_step,
 *     count: { "Claro_AR": 26 }, // per-operator availability
 *     totalCount: 26             // total available numbers
 *   }
 */
export async function getRentPricing(
  countryCode: string,
  dtype: RentDurationType = "week",
  dcount = 1
): Promise<{ services: RentServicePricing[]; totalAmount: number }> {
  const data = await rentRequest({
    method: "getdataWithProviders",
    country: countryCode,
    dtype,
    dcount,
  });

  const rawServices = Array.isArray(data?.data?.services) ? data.data.services : [];
  const services: RentServicePricing[] = rawServices.map((s: any) => {
    const totalCount = Number(s.totalCount ?? 0);
    return {
      serviceCode: String(s.service ?? ""),
      name: String(s.name ?? ""),
      pricePerDay: Number(s.price_day ?? 0),
      totalCount,
      imgPath: s.img ? String(s.img) : null,
      available: totalCount > 0,
    };
  });

  return { services, totalAmount: Number(data?.data?.totalAmount ?? 0) };
}

export interface RentOrderResult {
  providerOrderId: string;
  phoneNumber: string;
  countryDialCode: string;
  until: number; // unix seconds
}

/**
 * Buys a new rental number for one service.
 *
 * dtype/dcount follow the documented `create` params. Note the docs show
 * dtype as "week" | "month", but pricing is quoted per day (price_day) and
 * add_service_to_order accepts a rent_days param - if you need arbitrary
 * day counts here, check whether create also accepts dtype=day.
 */
export async function createRentOrder(
  countryCode: string,
  serviceCode: string,
  dtype: RentDurationType,
  dcount: number
): Promise<RentOrderResult> {
  const data = await rentRequest({
    method: "create",
    country: countryCode,
    service: serviceCode,
    dtype,
    dcount,
  });

  const d = data?.data;
  if (!d?.id || !d?.pnumber) {
    throw new SmspvaRentError("Provider did not return a usable rental number");
  }

  return {
    providerOrderId: String(d.id),
    phoneNumber: String(d.pnumber),
    countryDialCode: String(d.ccode ?? ""),
    until: Number(d.until ?? 0),
  };
}

export interface RentSmsMessage {
  sender: string;
  text: string;
  receivedAt: string | null;
}

/**
 * All SMS received on a rental order so far. The docs show
 * data: { SmsList: [], OtherSms: [] } without detailing the item shape -
 * normalized defensively below; verify against a live response.
 */
export async function getRentSms(providerOrderId: string): Promise<RentSmsMessage[]> {
  const data = await rentRequest({ method: "sms", id: providerOrderId });
  const raw = [
    ...(Array.isArray(data?.data?.SmsList) ? data.data.SmsList : []),
    ...(Array.isArray(data?.data?.OtherSms) ? data.data.OtherSms : []),
  ];
  return raw.map((m: any) => ({
    sender: m.sender ?? m.from ?? "",
    text: m.text ?? m.sms ?? m.message ?? "",
    receivedAt: m.date ?? m.receivedAt ?? null,
  }));
}

/** Extends an existing rental order by an additional week/month. */
export async function prolongRentOrder(
  providerOrderId: string,
  dtype: RentDurationType,
  dcount: number
): Promise<void> {
  await rentRequest({ method: "prolong", id: providerOrderId, dtype, dcount });
}

/** Cancels/removes a rental order. */
export async function deleteRentOrder(providerOrderId: string): Promise<void> {
  await rentRequest({ method: "delete", id: providerOrderId });
}
