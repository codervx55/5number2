"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Country + service selection now live in ServiceCountryPicker (step 1 / step 2
// flow above this bar). This bar is just the free-text search + sort for the
// resulting listing grid.
export function FiltersBar({
  query,
  onQueryChange,
  sort,
  onSortChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  sort: "price" | "success" | "stock";
  onSortChange: (v: "price" | "success" | "stock") => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search within results…"
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
  );
}
