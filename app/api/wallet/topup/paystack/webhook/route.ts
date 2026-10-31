import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { creditTopup } from "@/lib/topup";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  console.log("[wh] hit", { hasSig: !!signature, len: rawBody.length });

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[wh] bad signature (check PAYSTACK_SECRET_KEY is the LIVE key)");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  const reference = event?.data?.reference as string | undefined;
  console.log("[wh] event", event?.event, event?.data?.channel, reference);

  if (event?.event !== "charge.success" || !reference) {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await creditTopup(reference);
    console.log("[wh] result", reference, result);
    return NextResponse.json({ received: true, result });
  } catch (err) {
    console.error("[wh] processing failed", err, (err as any)?.cause);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
