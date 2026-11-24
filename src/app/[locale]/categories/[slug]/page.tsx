import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getCatalogDictionary } from "@/features/catalog/categories";
import { catalog } from "@/features/catalog/repository";
import { parseCatalogQuery } from "@/features/catalog/query";
import { CatalogListing, PageHero } from "@/components/catalog/CatalogView";

// Filters come from the URL, so these pages render per request.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Categories are managed in the admin area, so pages are rendered on demand (and revalidated on change).
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const t = await getCatalogDictionary(locale);
  const cat = t.categories.items.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name} — Hyundai, Kia — gremu`,
    description: cat.parts,
    alternates: { canonical: `/${locale}/categories/${slug}`, languages: { ru: `/ru/categories/${slug}`, uz: `/uz/categories/${slug}` } },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getCatalogDictionary(locale);
  const cat = t.categories.items.find((c) => c.slug === slug);
  if (!cat) notFound();

  const q = { ...parseCatalogQuery(await searchParams), category: slug };
  const result = await catalog.search(q);

  return (
    <>
      <PageHero
        title={cat.name}
        crumbs={[
          { href: `/${locale}`, label: t.catalog.home },
          { href: `/${locale}/catalog`, label: t.catalog.title },
          { label: cat.name },
        ]}
        note={result.items.some((p) => p.isDemo) ? t.catalog.demoNote : undefined}
      >
        <p className="mt-4 max-w-[52ch] text-lg text-cream/70">{cat.parts}</p>
      </PageHero>
      <CatalogListing
        locale={locale}
        t={{ catalog: t.catalog, categories: t.categories }}
        q={q}
        result={result}
        basePath={`/${locale}/categories/${slug}`}
        fixedCategory={slug}
      />
    </>
  );
}
