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