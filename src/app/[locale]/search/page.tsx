import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getCatalogDictionary } from "@/features/catalog/categories";
import { catalog } from "@/features/catalog/repository";
import { parseCatalogQuery } from "@/features/catalog/query";
import { CatalogListing, PageHero } from "@/components/catalog/CatalogView";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchIcon } from "@/components/ui/icons";

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
  return { title: `${t.catalog.searchTitle} — gremu`, robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getCatalogDictionary(locale);
  const sp = await searchParams;
  const oem = (Array.isArray(sp.oem) ? sp.oem[0] : sp.oem)?.trim().slice(0, 60);
  const q = parseCatalogQuery({ ...sp, q: oem ?? sp.q });

  const exact = oem ? await catalog.findByOem(oem) : [];
  const result = q.q ? await catalog.search(q) : { items: [], total: 0, page: 1, pageSize: 12, pageCount: 1 };

  return (
    <>
      <PageHero
        title={q.q ? `${t.catalog.resultsFor}: «${q.q}»` : t.catalog.searchTitle}
        crumbs={[{ href: `/${locale}`, label: t.catalog.home }, { label: t.catalog.searchTitle }]}
        note={result.items.some((p) => p.isDemo) ? t.catalog.demoNote : undefined}
      >
        <form action={`/${locale}/search`} method="get" role="search" className="mt-8 flex max-w-2xl gap-2">
          <label htmlFor="s-q" className="sr-only">
            {t.catalog.searchLabel}
          </label>
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              id="s-q"
              name="q"
              defaultValue={q.q ?? ""}
              placeholder={t.catalog.searchLabel}
              autoComplete="off"
              spellCheck={false}
              className="h-14 w-full rounded-full bg-paper pr-4 pl-12 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
          <button type="submit" className="h-14 rounded-full bg-cream px-6 font-medium text-petrol-900 transition-transform hover:-translate-y-px">
            {t.catalog.searchCta}
          </button>
        </form>
      </PageHero>

      {oem && (
        <section className="bg-paper-2 pt-10">
          <div className="wrap">
            <h2 className="text-xl font-medium text-petrol-900">{t.catalog.oemExact}</h2>
            {exact.length ? (
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {exact.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} locale={locale} t={t.catalog} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-ink-2">{t.catalog.oemNone}</p>
            )}
          </div>
        </section>
      )}

      {q.q && (
        <CatalogListing
          locale={locale}
          t={{ catalog: t.catalog, categories: t.categories }}
          q={q}
          result={result}
          basePath={`/${locale}/search`}
        />
      )}
    </>
  );
}
