"use client";

import { useState } from "react";
import Image from "next/image";
import { SmspvaService } from "@/lib/types";
import { cn } from "@/lib/utils";

// Deterministic color pick so the same service always gets the same badge color
const BADGE_COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

function initialsFor(name: string) {
  const cleaned = name.replace(/\(.*?\)/g, "").trim();
  const words = cleaned.split(/[\s.]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function SmspvaServiceIcon({
  service,
  size = 30,
}: {
  service: SmspvaService;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showLogo = service.hasCustomLogo && !failed;

  if (!showLogo) {
    const color = colorFor(service.name);
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold"
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}1a`,
          color,
          fontSize: size * 0.34,
        }}
        title={service.name}
      >
        {initialsFor(service.name)}
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-white"
      style={{ width: size, height: size }}
      title={service.name}
    >
      <Image
        src={service.logoUrl}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain p-[3px]"
        unoptimized
        onError={() => setFailed(true)}
      />
    </span>
  );
}
