import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail, generateSixDigitCode } from "@/lib/resend";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST /api/auth/send-code
 * Body: { email: string }
 *
 * Generates a code, stores it, and emails it via Resend. Called both for
 * new signups and for "resend code" clicks.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const code = generateSixDigitCode();

  try {
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    await sendVerificationCodeEmail(email, code);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send verification code:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Try again." },
      { status: 500 }
    );
  }
}
