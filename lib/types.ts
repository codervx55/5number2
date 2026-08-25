export interface Country {
  code: string; // ISO 3166-1 alpha-2, lowercase, used for flagcdn
  name: string;
  dialCode: string;
}

export interface Service {
  id: string;
  name: string;
  color: string; // tailwind-safe hex for icon badge background
}

export interface Listing {
  id: string;
  countryCode: string;
  serviceId: string;
  priceInPoints: number;
  successRate: number; // 0-100
  stock: number;
}

export type OrderStatus = "waiting" | "received" | "expired" | "cancelled";

export interface SmsMessage {
  id: string;
  sender: string;
  body: string;
  code: string | null;
  receivedAt: string; // ISO timestamp
}

export interface Order {
  id: string;
  listing: Listing;
  phoneNumber: string;
  status: OrderStatus;
  purchasedAt: string;
  expiresAt: string;
  pricePaid: number;
  messages: SmsMessage[];
}
