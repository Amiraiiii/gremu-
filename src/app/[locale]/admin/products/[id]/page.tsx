import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminProduct, getProductMeta, listBrandsAdmin, listCategoriesAdmin } from "@/features/catalog/admin";
import { deleteProductAction } from "../../catalog-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Товар — gremu admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const session = await requireAdmin(locale);
  if (!/^[a-z0-9-]{3,40}$/.test(id)) notFound();
  const [p, meta, cats, brands] = await Promise.all([getAdminProduct(id), getProductMeta(id), listCategoriesAdmin(), listBrandsAdmin()]);
  if (!p || !meta) notFound();
  const saved = Boolean((await searchParams).saved);

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="products">
      <Link href={`/${locale}/admin/products`} className="text-sm text-petrol-700 underline-offset-4 hover:underline">
        ← Все товары
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">{p.title.ru}</h1>
          <p className="mono-num mt-1 text-sm text-muted">
            {p.sku}
            {p.isDemo ? " · demo" : ""} · {meta.isPublished ? "опубликован" : "скрыт"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta.isPublished && (
            <Link href={`/${locale}/products/${p.slug}`} target="_blank" className="inline-flex h-11 items-center rounded-full px-4 text-sm text-petrol-900 ring-1 ring-line hover:bg-paper">
              Открыть на сайте ↗
            </Link>
          )}
          {session.role === "admin" && (
            <form action={deleteProductAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="inline-flex h-11 items-center rounded-full px-4 text-sm text-bad ring-1 ring-bad/30 hover:bg-bad/8">
                Удалить товар
              </button>
            </form>
          )}
        </div>
      </div>
      {saved && (
        <p role="status" className="mb-6 rounded-xl bg-ok/10 px-4 py-3 text-sm text-ok ring-1 ring-ok/25">
          Сохранено. Изменения уже на сайте.
        </p>
      )}
      <ProductForm
        key={p.updatedAt}
        locale={locale}
        categories={cats}
        brands={brands.map((b) => b.name)}
        initial={{
          id: p.id,
          slug: p.slug,
          sku: p.sku,
          oemNumber: p.oemNumber ?? "",
          categorySlug: p.categorySlug,
          brand: p.manufacturer === "—" ? "" : p.manufacturer,
          vehicleMake: p.vehicleMake,
          partType: p.partType,
          titleRu: p.title.ru,
          titleUz: p.title.uz,
          descriptionRu: p.description.ru,
          descriptionUz: p.description.uz,
          priceUzs: String(Math.round(p.priceMinor / 100)),
          stockQuantity: p.stockQuantity == null ? "" : String(p.stockQuantity),
          availability: p.availability,
          isPublished: meta.isPublished,
          imageUrl: p.imageUrl ?? "",
          specs: p.specs.map((s) => ({ ru: s.label.ru, uz: s.label.uz, value: s.value })),
          fitments: p.fitments.map((f) => ({
            make: f.make,
            model: f.model,
            generation: f.generation ?? "",
            yearFrom: String(f.yearFrom),
            yearTo: String(f.yearTo),
            engine: f.engine ?? "",
            status: f.status,
          })),
        }}
      />
    </AdminShell>
  );
}
