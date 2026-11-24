import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CsvImportForm } from "@/components/admin/CsvImportForm";
import { COLUMNS } from "@/features/catalog/csv";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Импорт CSV — gremu admin", robots: { index: false, follow: false } };

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await requireAdmin(locale, "admin");
  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="products">
      <Link href={`/${locale}/admin/products`} className="text-sm text-petrol-700 underline-offset-4 hover:underline">
        ← Все товары
      </Link>
      <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-petrol-900">Импорт товаров из CSV</h1>
      <div className="mt-4 mb-6 max-w-3xl space-y-2 text-sm text-ink-2">
        <p>
          Проще всего начать с{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
          <a href="/api/admin/products/export" className="font-medium text-petrol-700 underline underline-offset-4">
            экспорта
          </a>
          : в нём все колонки в нужном формате. Разделитель — «;» или «,», кодировка UTF-8.
        </p>
        <p>
          Товар ищется по артикулу (sku): существующий обновляется, новый создаётся. Если в файле есть хоть одна ошибка, не записывается ничего.
        </p>
        <p>
          Колонки: <span className="mono-num text-xs">{COLUMNS.join(", ")}</span>.
        </p>
        <p>
          Совместимость — в колонке fitments, строки через «;»: <span className="mono-num text-xs">kia|Cerato|2018|2023|2.0|verified|BD</span> (марка | модель | год с | год по |
          двигатель | статус verified/unverified/not_compatible | поколение). Покупателю «Подходит» показывается только для verified.
        </p>
      </div>
      <CsvImportForm locale={locale} />
    </AdminShell>
  );
}
