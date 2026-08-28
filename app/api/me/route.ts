import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/** GET /api/me - current user's wallet balance, for the header display. */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { walletBalance: true, email: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User record not found." }, { status: 404 });
  }

  return NextResponse.json({
    walletBalance: Number(dbUser.walletBalance),
    email: dbUser.email,
  });
}
