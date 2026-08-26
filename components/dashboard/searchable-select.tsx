"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchableSelect<T>({
  items,
  selected,
  onSelect,
  getKey,
  getLabel,
  getSearchText,
  renderIcon,
  allLabel,
  placeholder = "Search…",
  buttonClassName,
}: {
  items: T[];
  selected: T | null;
  onSelect: (item: T | null) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSearchText?: (item: T) => string;
  renderIcon?: (item: T) => React.ReactNode;
  allLabel: string;
  placeholder?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      (getSearchText ? getSearchText(item) : getLabel(item)).toLowerCase().includes(q)
    );
  }, [items, query, getLabel, getSearchText]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 min-w-[150px] items-center gap-2 rounded-md border border-border bg-white px-2.5 text-[13px] text-foreground shadow-xs hover:bg-muted/50",
          buttonClassName
        )}
      >
        {selected && renderIcon ? renderIcon(selected) : null}
        <span className="flex-1 truncate text-left">
          {selected ? getLabel(selected) : allLabel}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[280px] overflow-hidden rounded-lg border border-border bg-white shadow-card-hover">
          <div className="relative border-b border-border">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full bg-transparent pl-8 pr-2.5 text-[13px] text-foreground outline-none"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin p-1">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-muted",
                !selected && "bg-primary-50 text-primary-700"
              )}
            >
              {allLabel}
            </button>
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-[12.5px] text-muted-foreground">
                No matches
              </p>
            )}
            {filtered.slice(0, 200).map((item) => (
              <button
                type="button"
                key={getKey(item)}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-muted",
                  selected && getKey(selected) === getKey(item) && "bg-primary-50 text-primary-700"
                )}
              >
                {renderIcon?.(item)}
                <span className="truncate">{getLabel(item)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
