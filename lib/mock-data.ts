import { Country, Service, Listing, Order } from "./types";

export const countries: Country[] = [
  { code: "us", name: "United States", dialCode: "+1" },
  { code: "gb", name: "United Kingdom", dialCode: "+44" },
  { code: "ng", name: "Nigeria", dialCode: "+234" },
  { code: "in", name: "India", dialCode: "+91" },
  { code: "id", name: "Indonesia", dialCode: "+62" },
  { code: "br", name: "Brazil", dialCode: "+55" },
  { code: "de", name: "Germany", dialCode: "+49" },
  { code: "fr", name: "France", dialCode: "+33" },
  { code: "ca", name: "Canada", dialCode: "+1" },
  { code: "ph", name: "Philippines", dialCode: "+63" },
  { code: "za", name: "South Africa", dialCode: "+27" },
  { code: "pl", name: "Poland", dialCode: "+48" },
  { code: "mx", name: "Mexico", dialCode: "+52" },
  { code: "vn", name: "Vietnam", dialCode: "+84" },
  { code: "ru", name: "Russia", dialCode: "+7" },
  { code: "es", name: "Spain", dialCode: "+34" },
  { code: "it", name: "Italy", dialCode: "+39" },
  { code: "nl", name: "Netherlands", dialCode: "+31" },
  { code: "tr", name: "Turkey", dialCode: "+90" },
  { code: "ke", name: "Kenya", dialCode: "+254" },
];

export const services: Service[] = [
  { id: "instagram", name: "Instagram", color: "#E1306C" },
  { id: "whatsapp", name: "WhatsApp", color: "#25D366" },
  { id: "telegram", name: "Telegram", color: "#229ED9" },
  { id: "facebook", name: "Facebook", color: "#1877F2" },
  { id: "tiktok", name: "TikTok", color: "#111111" },
  { id: "twitter", name: "X / Twitter", color: "#000000" },
  { id: "discord", name: "Discord", color: "#5865F2" },
  { id: "google", name: "Google", color: "#4285F4" },
  { id: "amazon", name: "Amazon", color: "#FF9900" },
  { id: "tinder", name: "Tinder", color: "#FE3C72" },
  { id: "snapchat", name: "Snapchat", color: "#FFFC00" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2" },
  { id: "microsoft", name: "Microsoft", color: "#00A4EF" },
  { id: "apple", name: "Apple", color: "#555555" },
  { id: "uber", name: "Uber", color: "#000000" },
  { id: "paypal", name: "PayPal", color: "#003087" },
];

// Deterministic pseudo-random generator so mock data is stable across renders
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildListings(): Listing[] {
  const rand = seeded(42);
  const listings: Listing[] = [];
  let idx = 0;
  for (const country of countries) {
    for (const service of services) {
      // Not every country/service pair exists — skip some for realism
      if (rand() < 0.28) continue;
      idx += 1;
      const price = Math.round(8 + rand() * 42);
      const successRate = Math.round(78 + rand() * 21);
      const stock = Math.round(rand() * 400);
      listings.push({
        id: `${country.code}-${service.id}-${idx}`,
        countryCode: country.code,
        serviceId: service.id,
        priceInPoints: price,
        successRate: Math.min(successRate, 99),
        stock,
      });
    }
  }
  return listings;
}

export const listings: Listing[] = buildListings();

export const pointPackages = [
  { id: "starter", points: 100, price: 4.99, bonus: 0 },
  { id: "basic", points: 300, price: 12.99, bonus: 20 },
  { id: "popular", points: 750, price: 27.99, bonus: 75, highlight: true },
  { id: "pro", points: 1500, price: 49.99, bonus: 200 },
  { id: "business", points: 4000, price: 119.99, bonus: 700 },
];

export const mockOrders: Order[] = [
  {
    id: "ord_9182",
    listing: listings[3],
    phoneNumber: "+91 98212 44510",
    status: "received",
    purchasedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 8).toISOString(),
    pricePaid: listings[3].priceInPoints,
    messages: [
      {
        id: "m1",
        sender: "Instagram",
        body: "Your Instagram code is 482-193. Don't share this code with anyone.",
        code: "482193",
        receivedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
  },
  {
    id: "ord_7734",
    listing: listings[10],
    phoneNumber: "+1 302 555 0134",
    status: "expired",
    purchasedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    pricePaid: listings[10].priceInPoints,
    messages: [],
  },
];
