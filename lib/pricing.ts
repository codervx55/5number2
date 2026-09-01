/**
 * Central pricing config.
 *
 * A provider charges us a wholesale price in USD; we resell at a markup.
 * 1 point = $1, so no currency conversion is needed - the marked-up USD
 * figure IS the number of points charged.
 *
 * Margins differ per provider (5sim numbers carry a higher markup than
 * SMSPVA). Keep this in ONE place: the same function must be used both when
 * displaying prices and when charging the wallet, or the two drift apart and
 * users get charged something different from what they saw.
 */

/** Per-provider markup. 0.25 = 25%, 0.50 = 50%. */
export const MARGINS = {
  smspva: 0.25,
  "5sim": 0.5,
} as const;

/** Fallback markup for anything without an explicit provider margin. */
export const DEFAULT_MARGIN = 0.25;

type Provider = keyof typeof MARGINS | string;

/**
 * Converts a provider (wholesale) price into the retail price we charge,
 * using that provider's margin. Rounded to 2dp since that's what the UI
 * shows and what the DB stores (Decimal(10,2)).
 *
 * `provider` is optional so existing callers keep working (they get the
 * default margin); pass "5sim" or "smspva" to apply the per-provider rate.
 */
export function applyMargin(providerPrice: number, provider?: Provider): number {
  const margin =
    provider && provider in MARGINS
      ? MARGINS[provider as keyof typeof MARGINS]
      : DEFAULT_MARGIN;
  return Number((providerPrice * (1 + margin)).toFixed(2));
}
