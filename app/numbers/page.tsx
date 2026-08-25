"use client";

import { Header } from "@/components/dashboard/header";
import { CountryFlag } from "@/components/dashboard/country-flag";
import { ServiceIcon } from "@/components/dashboard/service-icon";
import { Badge } from "@/components/ui/badge";
import { mockOrders, countries, services } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, Inbox } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig = {
  received: { label: "SMS received", icon: CheckCircle2, className: "text-primary-700 bg-primary-50" },
  waiting: { label: "Waiting", icon: Clock, className: "text-amber-700 bg-amber-50" },
  expired: { label: "Expired", icon: XCircle, className: "text-muted-foreground bg-muted" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-muted-foreground bg-muted" },
};

export default function NumbersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">
            My numbers
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Order history and past SMS verifications.
          </p>
        </div>

        {mockOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Inbox size={20} className="mb-3 text-muted-foreground" />
            <p className="text-[13.5px] font-medium text-foreground">No orders yet</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Numbers you purchase will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockOrders.map((order, i) => {
              const country = countries.find((c) => c.code === order.listing.countryCode)!;
              const service = services.find((s) => s.id === order.listing.serviceId)!;
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CountryFlag code={country.code} size={22} />
                    <ServiceIcon service={service} size={32} />
                    <div>
                      <p className="text-[13.5px] font-medium text-foreground">{service.name}</p>
                      <p className="font-mono text-[12px] text-muted-foreground">
                        {order.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[12px] text-muted-foreground">
                        {formatRelativeTime(order.purchasedAt)}
                      </p>
                      <p className="text-[12px] font-medium text-foreground">
                        {order.pricePaid} pts
                      </p>
                    </div>
                    <Badge className={status.className}>
                      <StatusIcon size={11} className="mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
