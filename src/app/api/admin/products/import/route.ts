import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { staffFor } from "@/lib/auth/admin";
import { importProductsCsv } from "@/features/catalog/csv";

/**
 * POST multipart/form-data { file: <csv>, dryRun?: "1" } → JSON import report. Admin only.
 * Same rules as the admin page: all-or-nothing, max 2 MB. Cookie-authenticated, so a foreign
 * Origin is refused (CSRF).
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const session = await staffFor("admin");
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });

  const dryRun = ["1", "true", "on"].includes(String(form?.get("dryRun") ?? ""));
  const report = await importProductsCsv(await file.text(), session.sub, dryRun);
  if (report.ok && !dryRun) revalidatePath("/", "layout");
  return NextResponse.json(report, { status: report.ok ? 200 : 422 });
}
