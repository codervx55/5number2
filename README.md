# 5number

Virtual SMS temporary phone number platform — frontend built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui-style primitives, Lucide icons, and Framer Motion.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What's included

- **Dashboard (`/`)** — compact horizontal listing cards (flag · service · price/success/stock/Buy), search + service filter + sort, a right-hand panel that stays empty until you buy a number, then reveals the real number and a live-updating SMS inbox. The real number is never shown before purchase — cards only ever display a masked placeholder.
- **Buy Points (`/buy-points`)** — point package cards with a sticky order summary and simulated checkout.
- **My Numbers (`/numbers`)** — order history with status badges.
- **Settings (`/settings`)** — account, notifications, security.

## Business rules encoded in the UI

- Points must be purchased before numbers can be bought (`points` balance lives in `app/page.tsx` state and is shared via the header).
- The listing card and the buy-confirmation dialog only ever render a masked number (`+•• ••• ••••`).
- The real number and SMS inbox render only inside `ActiveNumberPanel`, which is only mounted after `confirmPurchase()` succeeds.

## Structure

```
app/
  page.tsx               Dashboard
  buy-points/page.tsx    Buy Points
  numbers/page.tsx        My Numbers / Order History
  settings/page.tsx       Settings
components/
  dashboard/             Feature components (cards, panels, filters, flags, icons)
  ui/                     Minimal shadcn-style primitives (button, card, badge, input, tabs, dialog)
lib/
  types.ts                Shared TypeScript types
  mock-data.ts             Countries, services, listings, point packages, mock orders
  utils.ts                 cn() helper + formatting helpers
```

## Backend status

**The Dashboard (`/`) and its number-buying flow are now wired to a real backend.** `Buy Points` and `My Numbers` are still mock/unwired (left as-is, on purpose).

### What's real now

| Route | What it does |
|---|---|
| `GET /api/listings?service=<id>` | Live stock + price per country for a service, via SMSPVA. Cached server-side for 5 min per service. |
| `POST /api/orders` | Buys a real number: re-verifies price/stock, calls SMSPVA `get_number`, deducts wallet balance, writes `Order` + `Transaction` rows. |
| `GET /api/orders` | Restores the active order (waiting/received) on page load. |
| `GET /api/orders/:id` | Polled every 4s while an order is "waiting" - checks SMSPVA for an incoming SMS, stores it, flips status to "received". |
| `DELETE /api/orders/:id` | Releases/cancels the active order. |
| `GET /api/me` | Current user's wallet balance (for the header). |

These map onto the **real** Prisma schema (`prisma/schema.prisma`, tables `five_number_*`) - not the old mock `Listing`/`Order` shapes. `lib/api-adapters.ts` translates between the two so the existing UI components didn't need to change.

### Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` - from Supabase (Project Settings → Database)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase (Project Settings → API)
   - `SMSPVA_API_KEY` - from your SMSPVA account
2. `npm install` (this also runs `prisma generate` via postinstall)
3. `npm run dev`

### Known gaps / TODOs to verify before going live

- **SMSPVA endpoint param/response names are unconfirmed.** `lib/smspva.ts` uses the method names from the original code's TODOs (`get_count_new`, `get_service_price`, `get_number`, `get_sms`), but the exact response field names (e.g. `data.count` vs `data.total`) are best-guess and marked with `// TODO` comments - check them against your SMSPVA account's actual API docs.
- **`/api/listings` fans out one request per country per service** (up to ~250 calls), batched 10-at-a-time, cached 5 min. If SMSPVA supports an "all countries at once" mode for `get_count_new`, switching to that would be far more efficient - see the TODO in `app/api/listings/route.ts`.
- **`successRate` has no real source** - SMSPVA doesn't expose this in the endpoints used here. Currently hardcoded to `0`; either drop it from the UI or find a real source.
- **`User.id` is assumed to equal the Supabase Auth user id.** If your signup flow creates `five_number_users` rows under a different id scheme, update the lookups in `app/api/orders/route.ts` and `app/api/me/route.ts`.
- **The in-memory listings cache is per-process** - fine for a single server instance; move to Redis/shared cache if you scale horizontally.
- **`Buy Points` and `My Numbers` are untouched** - still reading from `lib/mock-data.ts` as before.

Flags are loaded from `flagcdn.com` (already whitelisted in `next.config.js`).
