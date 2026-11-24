import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { SearchIcon } from "@/components/ui/icons";
import { listAdminProducts, listCategoriesAdmin } from "@/features/catalog/admin";
import { quickUpdateAction } from "../catalog-actions";
import { AVAIL_LABEL } from "@/features/catalog/labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Товары — gremu admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminProducts({ params, searchParams }: Props) {
  const { locale } = await params;
  const session = await requireAdmin(locale);
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const published = one(sp.published);
  const page = Number.parseInt(one(sp.page), 10) || 1;
  const [data, cats] = await Promise.all([listAdminProducts({ q, category, published, page }), listCategoriesAdmin()]);
  const catName = new Map(cats.map((c) => [c.slug, c.nameRu]));

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, published, ...over })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/${locale}/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="products">
      {one(sp.deleted) && <p role="status" className="mb-6 rounded-xl bg-ok/10 px-4 py-3 text-sm text-ok ring-1 ring-ok/25">Товар удалён.</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">Товары</h1>
          <p className="mt-1 text-sm text-muted">Найдено: {data.total}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/products/export`} className="inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2">
            Экспорт CSV
          </a>
          {session.role === "admin" && (
            <Link href={`/${locale}/admin/products/import`} className="inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2">
              Импорт CSV
            </Link>
          )}
          <Link href={`/${locale}/admin/products/new`} className="inline-flex h-12 items-center rounded-full bg-petrol-900 px-5 text-sm font-medium text-cream">
            + Новый товар
          </Link>
        </div>
      </div>

      <form action={`/${locale}/admin/products`} method="get" role="search" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_15rem_12rem_auto]">
        <label htmlFor="pr-q" className="sr-only">
          Артикул, OEM или название
        </label>
        <div className="relative sm:col-span-2 lg:col-span-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input id="pr-q" name="q" defaultValue={q} placeholder="Артикул, OEM или название" className="field pl-10" />
        </div>
        <label htmlFor="pr-cat" className="sr-only">
          Категория
        </label>
        <select id="pr-cat" name="category" defaultValue={category} className="field">
          <option value="">Все категории</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nameRu}
            </option>
          ))}
        </select>
        <label htmlFor="pr-pub" className="sr-only">
          Публикация
        </label>
        <select id="pr-pub" name="published" defaultValue={published} className="field">
          <option value="">Все</option>
          <option value="yes">Опубликованы</option>
          <option value="no">Скрыты</option>
        </select>
        <button type="submit" className="h-12 rounded-full bg-petrol-900 px-5 text-sm font-medium text-cream">
          Показать
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[22px] bg-paper ring-1 ring-line">
        {data.rows.length === 0 ? (
          <p className="p-10 text-center text-ink-2">{q || category || published ? "Ничего не найдено." : "Каталог пуст. Добавьте товар или импортируйте CSV."}</p>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs tracking-wider text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Товар</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Наличие</th>
                <th className="px-4 py-3 font-medium" colSpan={4}>
                  Цена (сум) · Остаток · Опубликован
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(({ p, brand }) => (
                <tr key={p.id} className="border-b border-line align-middle last:border-0 hover:bg-paper-2">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/admin/products/${p.id}`} className="font-medium text-petrol-800 underline-offset-4 hover:underline">
                      {p.titleRu}
                    </Link>
                    <span className="mono-num block text-xs text-muted">
                      {p.sku}
                      {p.oemNumber ? ` · OEM ${p.oemNumber}` : ""}
                      {brand ? ` · ${brand}` : ""}
                      {p.isDemo ? " · demo" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{catName.get(p.categorySlug) ?? p.categorySlug}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{AVAIL_LABEL[p.availability] ?? p.availability}</td>
                  <td className="px-4 py-3" colSpan={4}>
                    <form action={quickUpdateAction} className="flex items-center gap-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={p.id} />
                      <label className="sr-only" htmlFor={`price-${p.id}`}>
                        Цена {p.sku}
                      </label>
                      <input id={`price-${p.id}`} name="priceUzs" inputMode="numeric" defaultValue={Math.round(p.priceMinor / 100)} className="field mono-num h-10 min-h-10 w-32" />
                      <label className="sr-only" htmlFor={`stock-${p.id}`}>
                        Остаток {p.sku}
                      </label>
                      <input
                        id={`stock-${p.id}`}
                        name="stockQuantity"
                        inputMode="numeric"
                        placeholder="—"
                        defaultValue={p.stockQuantity ?? ""}
                        className="field mono-num h-10 min-h-10 w-20"
                      />
                      <label className="inline-flex min-h-10 items-center gap-2 px-1">
                        <input type="checkbox" name="isPublished" defaultChecked={p.isPublished} className="size-4 accent-[var(--petrol-700)]" />
                        <span className="sr-only">Опубликован {p.sku}</span>
                      </label>
                      <button type="submit" className="h-10 rounded-full px-4 text-xs font-medium text-petrol-900 ring-1 ring-line hover:bg-paper">
                        Сохранить
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Пустой остаток — «не учитывается». При остатке 0 товар автоматически помечается «Нет в наличии».</p>

      {data.pageCount > 1 && (
        <nav aria-label="Страницы" className="mt-6 flex justify-center gap-2">
          {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: n > 1 ? n : undefined })}
              aria-current={n === data.page ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-full ${n === data.page ? "bg-petrol-900 text-cream" : "bg-paper ring-1 ring-line"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </AdminShell>
  );
}
