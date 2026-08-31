"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Wallet, Phone, Plus, Settings, History, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Phone },
  { href: "/rent", label: "Rent", icon: CalendarClock },
  { href: "/numbers", label: "My Numbers", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header({ points = 0 }: { points?: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1">
          <Image src="/logo-icon.png" alt="5" width={26} height={26} priority />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            number
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
            <Wallet size={15} className="text-primary-600" />
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              ${points.toFixed(2)}
            </span>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/buy-points">
              <Plus size={14} />
              <span className="hidden sm:inline">Add funds</span>
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
