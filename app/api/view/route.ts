import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/view
 * Increments the global site view counter. Called once per page load from the
 * client. Uses upsert so the single SiteStats row (id=1) is created if missing.
 * Fire-and-forget: any failure is swallowed so it never affects the user.
 */
export async function POST() {
  try {
    await prisma.siteStats.upsert({
      where: { id: 1 },
      update: { totalViews: { increment: 1 } },
      create: { id: 1, totalViews: 1 },
    });
  } catch {
    // ignore - view counting must never break the page
  }
  return NextResponse.json({ ok: true });
}
