import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * POST /api/users/ensure
 *
 * Supabase Auth signup only creates a row in its own internal auth.users
 * table - it does NOT touch five_number_users (walletBalance etc). Call
 * this right after signup (and safely again on every login, since it's an
 * upsert) so a matching row always exists before anything tries to read a
 * wallet balance.
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: {}, // don't overwrite existing walletBalance etc on repeat calls
    create: {
      id: user.id,
      email: user.email ?? "",
      walletBalance: 0,
    },
  });

  return NextResponse.json({ user: dbUser });
}
