/**
 * verify-smspva-countries.mjs
 *
 * Run this LOCALLY with your real SMSPVA API key to find out exactly which
 * countries SMSPVA actually supports - instead of trusting their docs page
 * (which we already caught missing Nigeria and India).
 *
 * It calls get_count_new against every plausible ISO country code, trying
 * two different services (SMSPVA's own catch-all "OTHER" and Telegram)
 * before concluding a country isn't real - a country can be genuinely valid
 * on SMSPVA while simply not carrying stock for one particular service,
 * which would otherwise look like a false "not supported" result.
 *
 * USAGE:
 *   1. cd into your project folder (where .env.local lives)
 *   2. node scripts/verify-smspva-countries.mjs
 *      (reads SMSPVA_API_KEY from .env.local automatically)
 *   3. When it finishes, it writes verified-countries.json in this folder.
 *      Paste me that file's content and I'll rebuild lib/smspva-countries.ts
 *      from real, confirmed data instead of the scraped docs table.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- load SMSPVA_API_KEY from .env.local without needing dotenv installed ---
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Could not find .env.local next to this script's project root.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const API_KEY = process.env.SMSPVA_API_KEY;
if (!API_KEY) {
  console.error("SMSPVA_API_KEY not found in .env.local");
  process.exit(1);
}

// Two probes, tried in order. If a country fails the first, we still try
// the second before giving up on it - a single service being unstocked in
// a country doesn't mean the country itself isn't real on SMSPVA.
const PROBE_SERVICES = ["opt19", "opt29"]; // OTHER (catch-all), then Telegram

// Comprehensive candidate list: full ISO 3166-1 alpha-2 set, plus SMSPVA's
// known non-ISO quirk (UK instead of GB). Every code we've seen SMSPVA use
// elsewhere follows plain ISO-2, so this should catch anything we missed.
const ISO_CANDIDATES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR",
  "BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL",
  "CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO",
  "DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA",
  "GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT",
  "GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO",
  "IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP",
  "KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR",
  "MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL",
  "NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN",
  "PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD",
  "SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX",
  "SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT",
  "TV","TW","TZ","UA","UG","UK","US","UY","UZ","VA","VC","VE","VG","VI","VN",
  "VU","WF","WS","YE","YT","ZA","ZM","ZW",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkCountry(code) {
  for (const service of PROBE_SERVICES) {
    const url = `https://smspva.com/priemnik.php?metod=get_count_new&service=${service}&apikey=${API_KEY}&country=${code}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        continue; // try next probe service
      }
      // A recognized country echoes back "country" and includes numeric total/online -
      // present regardless of whether total is 0, so this still counts as "the
      // country is real", separate from "does it currently have stock".
      const looksValid = json && typeof json === "object" && "total" in json && "online" in json;
      if (looksValid) {
        return { code, supported: true, viaService: service, response: json };
      }
    } catch (err) {
      // network error on this probe - try the next one before giving up
      continue;
    }
    await sleep(2000); // still respect rate limit between the two probes for this country
  }
  return { code, supported: false };
}

async function main() {
  console.log(`Testing ${ISO_CANDIDATES.length} candidate country codes against SMSPVA...`);
  console.log("This takes several minutes due to rate limiting - let it run.\n");

  const results = [];
  for (let i = 0; i < ISO_CANDIDATES.length; i++) {
    const code = ISO_CANDIDATES[i];
    const result = await checkCountry(code);
    results.push(result);
    const status = result.supported ? "✅ SUPPORTED" : "—";
    console.log(`[${i + 1}/${ISO_CANDIDATES.length}] ${code}: ${status}`);
    await sleep(2000); // stay well under SMSPVA's 40 req/min limit
  }

  const supported = results.filter((r) => r.supported);
  const outPath = path.join(__dirname, "..", "verified-countries.json");
  fs.writeFileSync(outPath, JSON.stringify({ supported, allResults: results }, null, 2));

  console.log(`\nDone. ${supported.length} countries confirmed supported.`);
  console.log(`Full results written to: ${outPath}`);
  console.log("Paste that file's content back to Claude to rebuild the country list from real data.");
}

main();
