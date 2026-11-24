import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { listBrandsAdmin, listCategoriesAdmin } from "@/features/catalog/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новый товар — gremu admin", robots: { index: false, follow: false } };

export default async function NewProduct({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await requireAdmin(locale);
  const [cats, brands] = await Promise.all([listCategoriesAdmin(), listBrandsAdmin()]);
  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="products">
      <Link href={`/${locale}/admin/products`} className="text-sm text-petrol-700 underline-offset-4 hover:underline">
        ← Все товары
      </Link>
      <h1 className="mt-3 mb-6 text-3xl font-medium tracking-[-0.03em] text-petrol-900">Новый товар</h1>
      <ProductForm
        locale={locale}
        categories={cats}
        brands={brands.map((b) => b.name)}
        initial={{
          id: null,
          slug: "",
          sku: "",
          oemNumber: "",
          categorySlug: "",
          brand: "",
          vehicleMake: "hyundai",
          partType: "original",
          titleRu: "",
          titleUz: "",
          descriptionRu: "",
          descriptionUz: "",
          priceUzs: "",
          stockQuantity: "",
          availability: "on_request",
          isPublished: false,
          imageUrl: "",
          specs: [],
          fitments: [],
        }}
      />
    </AdminShell>
  );
}
