/**
 * Mapping layer between 5number's internal identifiers and 5sim's slugs.
 *
 * Scope is DELIBERATELY limited to the 12 popular services on the quick-pick
 * grid. These are the only services whose 5sim product name has been verified
 * against 5sim's live product list, so they're the only ones safe to offer a
 * 5sim option for. Every other service stays SMSPVA-only until its mapping is
 * verified - guessing a wrong product mapping would let a user buy "Netflix"
 * and receive a number for a different service.
 *
 * Two maps:
 *   SERVICE_TO_FIVESIM: 5number serviceId  -> 5sim product slug
 *   ISO_TO_FIVESIM_COUNTRY: ISO-3166 alpha-2 (lowercase) -> 5sim country slug
 *
 * The country map is keyed by ISO because both SMSPVA countries (which carry
 * an isoCode) and 5sim countries carry ISO codes, so we can resolve without
 * hand-maintaining 240+ name pairs.
 */

/** 5number serviceId -> 5sim product slug. Only the 12 verified popular ones. */
export const SERVICE_TO_FIVESIM: Record<string, string> = {
  whatsapp: "whatsapp",
  telegram: "telegram",
  "google-youtube-gmail": "google",
  facebook: "facebook",
  "instagram-threads": "instagram",
  tiktok: "tiktok",
  discord: "discord",
  amazon: "amazon",
  netflix: "netflix",
  "paypal-ebay": "paypal",
  steam: "steam",
  apple: "apple",
};

/**
 * ISO alpha-2 (lowercase) -> 5sim country slug.
 * Built from 5sim's /guest/countries response (each entry's `iso` field).
 * Only ISO codes 5sim actually serves are included; anything not here has no
 * 5sim option and falls back to SMSPVA-only.
 */
export const ISO_TO_FIVESIM_COUNTRY: Record<string, string> = {
  af: "afghanistan",
  al: "albania",
  dz: "algeria",
  ao: "angola",
  ag: "antiguaandbarbuda",
  ar: "argentina",
  am: "armenia",
  aw: "aruba",
  au: "australia",
  at: "austria",
  az: "azerbaijan",
  bs: "bahamas",
  bh: "bahrain",
  bd: "bangladesh",
  bb: "barbados",
  by: "belarus",
  be: "belgium",
  bz: "belize",
  bj: "benin",
  bt: "bhutane",
  ba: "bih",
  bo: "bolivia",
  bw: "botswana",
  br: "brazil",
  bg: "bulgaria",
  bf: "burkinafaso",
  bi: "burundi",
  kh: "cambodia",
  cm: "cameroon",
  ca: "canada",
  cv: "capeverde",
  td: "chad",
  cl: "chile",
  co: "colombia",
  km: "comoros",
  cg: "congo",
  cr: "costarica",
  hr: "croatia",
  cy: "cyprus",
  cz: "czech",
  dk: "denmark",
  dj: "djibouti",
  do: "dominicana",
  tl: "easttimor",
  ec: "ecuador",
  eg: "egypt",
  gb: "england",
  gq: "equatorialguinea",
  ee: "estonia",
  et: "ethiopia",
  fi: "finland",
  fr: "france",
  ga: "gabon",
  gm: "gambia",
  ge: "georgia",
  de: "germany",
  gh: "ghana",
  gr: "greece",
  gp: "guadeloupe",
  gt: "guatemala",
  gn: "guinea",
  gw: "guineabissau",
  gy: "guyana",
  ht: "haiti",
  hn: "honduras",
  hk: "hongkong",
  hu: "hungary",
  in: "india",
  id: "indonesia",
  ie: "ireland",
  il: "israel",
  it: "italy",
  ci: "ivorycoast",
  jm: "jamaica",
  jo: "jordan",
  kz: "kazakhstan",
  ke: "kenya",
  kw: "kuwait",
  kg: "kyrgyzstan",
  la: "laos",
  lv: "latvia",
  ls: "lesotho",
  lr: "liberia",
  lt: "lithuania",
  lu: "luxembourg",
  mo: "macau",
  mg: "madagascar",
  mw: "malawi",
  my: "malaysia",
  mv: "maldives",
  mr: "mauritania",
  mu: "mauritius",
  mx: "mexico",
  md: "moldova",
  mn: "mongolia",
  me: "montenegro",
  ma: "morocco",
  mz: "mozambique",
  na: "namibia",
  np: "nepal",
  nl: "netherlands",
  nc: "newcaledonia",
  ni: "nicaragua",
  ng: "nigeria",
  mk: "northmacedonia",
  no: "norway",
  om: "oman",
  pk: "pakistan",
  pa: "panama",
  pg: "papuanewguinea",
  py: "paraguay",
  pe: "peru",
  ph: "philippines",
  pl: "poland",
  pt: "portugal",
  pr: "puertorico",
  re: "reunion",
  ro: "romania",
  rw: "rwanda",
  kn: "saintkittsandnevis",
  lc: "saintlucia",
  vc: "saintvincentandgrenadines",
  sv: "salvador",
  ws: "samoa",
  sa: "saudiarabia",
  sn: "senegal",
  rs: "serbia",
  sc: "seychelles",
  sl: "sierraleone",
  sk: "slovakia",
  si: "slovenia",
  sb: "solomonislands",
  za: "southafrica",
  es: "spain",
  lk: "srilanka",
  sr: "suriname",
  sz: "swaziland",
  se: "sweden",
  tw: "taiwan",
  tj: "tajikistan",
  tz: "tanzania",
  th: "thailand",
  tt: "tit",
  tg: "togo",
  tn: "tunisia",
  tm: "turkmenistan",
  ug: "uganda",
  ua: "ukraine",
  uy: "uruguay",
  us: "usa",
  uz: "uzbekistan",
  ve: "venezuela",
  vn: "vietnam",
  zm: "zambia",
};

/** Returns the 5sim product slug for a 5number serviceId, or null if unmapped. */
export function fivesimProductFor(serviceId: string): string | null {
  return SERVICE_TO_FIVESIM[serviceId] ?? null;
}

/** Returns the 5sim country slug for an ISO code (any case), or null. */
export function fivesimCountryForIso(isoCode: string): string | null {
  if (!isoCode) return null;
  return ISO_TO_FIVESIM_COUNTRY[isoCode.toLowerCase()] ?? null;
}
