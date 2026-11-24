import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { listBrandsAdmin, listCategoriesAdmin } from "@/features/catalog/admin";
import { deleteBrandAction, deleteCategoryAction, saveBrandAction } from "../catalog-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Категории и бренды — gremu admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const ERRORS: Record<string, string> = {
  category_in_use: "Категорию нельзя удалить: в ней есть товары. Перенесите их или скройте категорию.",
  brand_in_use: "Бренд нельзя удалить: он указан у товаров.",
  brand_duplicate: "Такой бренд уже есть.",
  brand_invalid: "Название бренда — от 2 символов.",
};

export default async function AdminCatalog({ params, searchParams }: Props) {
  const { locale } = await params;
  const session = await requireAdmin(locale, "admin");
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const [cats, brands] = await Promise.all([listCategoriesAdmin(), listBrandsAdmin()]);
  const card = "rounded-[22px] bg-paper p-6 ring-1 ring-line";

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="catalog">
      <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">Категории и бренды</h1>
      {error && ERRORS[error] && (
        <p role="alert" className="mt-6 rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
          {ERRORS[error]}
        </p>
      )}

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-medium text-petrol-900">Категории</h2>
        <p className="mt-1 mb-5 text-xs text-muted">
          Порядок — меньше число, выше в меню. Скрытая категория пропадает из меню и фильтров; товары в ней остаются. Смена slug меняет адрес страницы категории.
        </p>
        <ul className="grid gap-4">
          {cats.map((c) => (
            <li key={c.slug} className="grid gap-2 border-b border-line pb-4 last:border-0">
              <CategoryForm locale={locale} initial={c} />
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>Товаров: {c.products}</span>
                {c.products === 0 && (
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slug" value={c.slug} />
                    <button type="submit" className="text-bad underline-offset-4 hover:underline">
                      Удалить категорию
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 mb-3 text-sm font-medium text-ink">Новая категория</h3>
        <CategoryForm locale={locale} initial={null} />
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-medium text-petrol-900">Бренды (производители деталей)</h2>
        <p className="mt-1 mb-5 text-xs text-muted">Бренд также создаётся автоматически при сохранении товара с новым производителем.</p>
        <ul className="grid gap-2">
          {brands.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2">
              <form action={saveBrandAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={b.id} />
                <label htmlFor={`brand-${b.id}`} className="sr-only">
                  Название бренда
                </label>
                <input id={`brand-${b.id}`} name="name" defaultValue={b.name} className="field w-64" />
                <button type="submit" className="h-11 rounded-full px-4 text-sm font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2">
                  Переименовать
                </button>
              </form>
              <span className="text-xs text-muted">Товаров: {b.products}</span>
              {b.products === 0 && (
                <form action={deleteBrandAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="h-11 px-2 text-xs text-bad underline-offset-4 hover:underline">
                    Удалить
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={saveBrandAction} className="mt-5 flex flex-wrap gap-2">
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="brand-new" className="sr-only">
            Новый бренд
          </label>
          <input id="brand-new" name="name" placeholder="Новый бренд" className="field w-64" />
          <button type="submit" className="h-11 rounded-full bg-petrol-900 px-4 text-sm font-medium text-cream">
            Добавить
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
