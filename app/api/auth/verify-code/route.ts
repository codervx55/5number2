import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/verify-code
 * Body: { email: string, code: string, password: string }
 *
 * Confirms the code matches a non-expired row, then creates the Supabase
 * Auth user directly with email_confirm: true (skipping Supabase's own
 * confirmation email, since we've already verified via our own code) and
 * creates the matching five_number_users row.
 *
 * The client is responsible for calling supabase.auth.signInWithPassword
 * right after this succeeds - creating a user via the admin API does not
 * itself produce a browser session.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const code = body?.code as string | undefined;
  const password = body?.password as string | undefined;

  if (!email || !code || !password) {
    return NextResponse.json(
      { error: "email, code, and password are required." },
      { status: 400 }
    );
  }

  const record = await prisma.verificationCode.findFirst({
    where: { email, code },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // already verified via our own code - skip Supabase's link email
  });

  if (error) {
    // Supabase returns a 422-style "already registered" error for dupes.
    const alreadyExists = /already registered|already exists/i.test(error.message);
    return NextResponse.json(
      { error: alreadyExists ? "An account with this email already exists. Log in instead." : error.message },
      { status: alreadyExists ? 409 : 500 }
    );
  }

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: {},
    create: { id: data.user.id, email, walletBalance: 0 },
  });

  // Consume the code so it can't be reused.
  await prisma.verificationCode.delete({ where: { id: record.id } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
