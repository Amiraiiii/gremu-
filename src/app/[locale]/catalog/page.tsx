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
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getCatalogDictionary(locale);
  return {
    title: `${t.catalog.title} — gremu`,
    description: t.categories.lead,
    alternates: { canonical: `/${locale}/catalog`, languages: { ru: "/ru/catalog", uz: "/uz/catalog" } },
  };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getCatalogDictionary(locale);
  const q = parseCatalogQuery(await searchParams);
  const result = await catalog.search(q);

  const makeLabel = q.make === "hyundai" ? "Hyundai" : q.make === "kia" ? "Kia" : null;
  const title = [t.catalog.title, makeLabel, q.model, q.year].filter(Boolean).join(" · ");

  return (
    <>
      <PageHero
        title={title}
        crumbs={[{ href: `/${locale}`, label: t.catalog.home }, { label: t.catalog.title }]}
        note={result.items.some((p) => p.isDemo) ? t.catalog.demoNote : undefined}
      />
      <CatalogListing locale={locale} t={{ catalog: t.catalog, categories: t.categories }} q={q} result={result} basePath={`/${locale}/catalog`} />
    </>
  );
}
