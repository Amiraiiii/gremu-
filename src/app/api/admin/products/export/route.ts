import { NextResponse } from "next/server";
import { staffFor } from "@/lib/auth/admin";
import { exportProductsCsv } from "@/features/catalog/csv";

/** GET → the whole catalog as CSV (UTF-8 with BOM, ";" separated, opens in Excel). Staff only. */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await staffFor("staff");
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const csv = await exportProductsCsv();
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gremu-catalog-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
