"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Service } from "@/lib/types";

export function FiltersBar({
  query,
  onQueryChange,
  services,
  activeService,
  onServiceChange,
  sort,
  onSortChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  services: Service[];
  activeService: string | null;
  onServiceChange: (id: string | null) => void;
  sort: "price" | "success" | "stock";
  onSortChange: (v: "price" | "success" | "stock") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by country or service…"
            className="pl-8"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="h-9 rounded-md border border-border bg-white px-2.5 text-[13px] text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="price">Sort: Price (low to high)</option>
          <option value="success">Sort: Success rate</option>
          <option value="stock">Sort: Stock available</option>
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => onServiceChange(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
            activeService === null
              ? "border-primary-600 bg-primary-50 text-primary-700"
              : "border-border bg-white text-muted-foreground hover:bg-muted"
          )}
        >
          All services
        </button>
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onServiceChange(s.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              activeService === s.id
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-border bg-white text-muted-foreground hover:bg-muted"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
