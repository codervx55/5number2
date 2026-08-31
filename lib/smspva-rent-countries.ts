// Countries supported by SMSPVA's Rental API (v1) - a SMALLER list than the
// Activation API's country set, confirmed from docs.smspva.com's Rental
// section. Reuses the comprehensive SMSPVA_COUNTRIES reference (which
// already covers every ISO country with isoCode/name/dialCode) rather than
// duplicating that data - this just filters it down to the codes the
// Rental API actually documents.
import { SMSPVA_COUNTRIES } from "./smspva-countries";
import { SmspvaCountry } from "./types";

const RENT_COUNTRY_CODES = [
  "UK", "US", "FR", "DE", "ES", "IT", "AU", "MX", "PH", "ID",
  "JP", "RO", "PT", "CA", "NO", "AR", "PL", "GR", "AT", "BD",
  "BE", "BG", "KH", "CR", "HR", "CY", "CZ", "DK", "EE", "FI",
  "GE", "HK", "HU", "IE", "KZ", "KG", "LV", "LT", "MY", "MT",
  "MD", "NL", "PY", "SK", "SI", "SE", "CH", "TH", "UA",
];

export const SMSPVA_RENT_COUNTRIES: SmspvaCountry[] = RENT_COUNTRY_CODES
  .map((code) => SMSPVA_COUNTRIES.find((c) => c.code === code))
  .filter((c): c is SmspvaCountry => Boolean(c));
