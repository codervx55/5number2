"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Phone, Plus, Settings, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Phone },
  { href: "/numbers", label: "My Numbers", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header({ points = 1240 }: { points?: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-[13px] font-bold text-white">
            5
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            5number
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1.5">
            <Coins size={15} className="text-primary-600" />
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {points.toLocaleString()}
            </span>
            <span className="hidden text-[12px] text-muted-foreground sm:inline">points</span>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/buy-points">
              <Plus size={14} />
              <span className="hidden sm:inline">Buy points</span>
            </Link>
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 md:hidden">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] font-medium",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
