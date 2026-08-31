// Adapter for rent orders, following the same pattern as lib/api-adapters.ts
// for activation orders: translate the flat Prisma row shape into whatever
// the rent UI components want, in one place.

export interface ApiRentOrderMessage {
  id: string;
  sender: string;
  text: string;
  receivedAt: string;
}

export interface ApiRentOrder {
  id: string;
  platform: string; // rent service id (lib/smspva-rent-services.ts)
  country: string; // rent country code (lib/smspva-rent-countries.ts)
  price: number | string; // Decimal serializes as string over JSON
  status: string; // "active" | "cancelled"
  phoneNumber: string;
  expiresAt: string;
  createdAt: string;
  rentDtype: string | null;
  rentDcount: number | null;
  messages: ApiRentOrderMessage[];
}

export interface RentOrder {
  id: string;
  serviceId: string;
  countryCode: string;
  pricePaid: number;
  status: "active" | "cancelled";
  phoneNumber: string;
  expiresAt: string;
  purchasedAt: string;
  dtype: "week" | "month" | null;
  dcount: number | null;
  messages: ApiRentOrderMessage[];
}

export function adaptRentOrder(o: ApiRentOrder): RentOrder {
  return {
    id: o.id,
    serviceId: o.platform,
    countryCode: o.country,
    pricePaid: Number(o.price),
    status: o.status as "active" | "cancelled",
    phoneNumber: o.phoneNumber,
    expiresAt: o.expiresAt,
    purchasedAt: o.createdAt,
    dtype: (o.rentDtype as "week" | "month" | null) ?? null,
    dcount: o.rentDcount,
    messages: o.messages,
  };
}
