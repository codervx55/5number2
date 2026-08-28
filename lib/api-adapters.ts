import { Order, OrderStatus, SmsMessage, Listing } from "./types";

/**
 * The real backend (Prisma schema) stores orders flat - platform/country as
 * plain strings, price as Decimal, message text as `text`. The existing UI
 * components (ActiveNumberPanel, BuyConfirmDialog, etc.) were built against
 * the mock shape - a nested `listing` object, `body` instead of `text`, etc.
 *
 * Rather than rewrite every component, this adapter translates one shape
 * into the other at the API boundary. If you later refactor the components
 * to consume the real shape directly, this file is the only place that
 * needs to change.
 */

export interface ApiOrderMessage {
  id: string;
  sender: string;
  text: string;
  code: string | null;
  receivedAt: string;
}

export interface ApiOrder {
  id: string;
  userId: string;
  platform: string; // serviceId
  country: string; // country code
  price: number | string; // Decimal serializes as string over JSON
  status: string;
  provider: string;
  providerOrderId: string;
  phoneNumber: string;
  code: string | null;
  expiresAt: string;
  createdAt: string;
  orderType: string;
  rentHours: number | null;
  messages: ApiOrderMessage[];
}

function toMessage(m: ApiOrderMessage): SmsMessage {
  return {
    id: m.id,
    sender: m.sender,
    body: m.text,
    code: m.code,
    receivedAt: m.receivedAt,
  };
}

export function adaptOrder(apiOrder: ApiOrder): Order {
  const price = Number(apiOrder.price);
  const listing: Listing = {
    id: apiOrder.id,
    countryCode: apiOrder.country,
    serviceId: apiOrder.platform,
    priceInPoints: price,
    successRate: 0,
    stock: 0,
  };

  return {
    id: apiOrder.id,
    listing,
    phoneNumber: apiOrder.phoneNumber,
    status: apiOrder.status as OrderStatus,
    purchasedAt: apiOrder.createdAt,
    expiresAt: apiOrder.expiresAt,
    pricePaid: price,
    messages: apiOrder.messages.map(toMessage),
  };
}
