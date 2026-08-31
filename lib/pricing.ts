/**
 * Central pricing config.
 *
 * SMSPVA charges us a wholesale price in USD; we resell to users at a
 * markup. 1 point = $1, so no currency conversion is needed - the marked-up
 * USD figure IS the number of points charged.
 *
 * Keep this in ONE place: the same function must be used both when
 * displaying prices and when charging the wallet, or the two can drift
 * apart and users get charged something different from what they saw.
 */

/** Our margin over the provider's wholesale price. 0.25 = 25% markup. */
export const MARGIN = 0.25;

/**
 * Converts a provider (wholesale) price into the retail price we charge.
 * Rounded to 2dp since that's what the UI shows and what the DB stores
 * (Decimal(10,2)) - without rounding, the displayed and charged values
 * can differ by fractions of a cent.
 */
export function applyMargin(providerPrice: number): number {
  return Number((providerPrice * (1 + MARGIN)).toFixed(2));
}