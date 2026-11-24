import { NextResponse } from "next/server";
import { handlePaymeRequest } from "@/features/payments/payme/merchant";

/**
 * Payme Merchant API endpoint. Register `${APP_URL}/api/payments/payme` as the endpoint URL
 * in the Payme business cabinet. Payme expects HTTP 200 with a JSON-RPC body, errors included.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = (await req.text()).slice(0, 64_000);
  const res = await handlePaymeRequest(raw, req.headers.get("authorization"));
  return NextResponse.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
}
