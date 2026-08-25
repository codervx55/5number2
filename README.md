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

## Wiring up a real backend

Replace the in-memory state in `app/page.tsx` and `lib/mock-data.ts` with real API calls:

1. `GET /api/listings` → replace `listings` array.
2. `POST /api/orders` (on buy confirm) → returns the real number; only then set `activeOrder`.
3. A websocket or polling hook on the active order id → push new messages into `ActiveNumberPanel`.
4. `POST /api/points/checkout` on the Buy Points page for real payment processing.

Flags are loaded from `flagcdn.com` (already whitelisted in `next.config.js`).
