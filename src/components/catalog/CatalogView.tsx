import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { toSearchParams } from "@/features/catalog/query";
import type { CatalogQuery, CatalogResult } from "@/features/catalog/types";
import { FilterPanel, SortSelect } from "./CatalogControls";
import { ArrowRight } from "@/components/ui/icons";
import { ProductCard } from "./ProductCard";

type T = { catalog: Dictionary["catalog"]; categories: Dictionary["categories"] };

/** Dark page band under the floating header: breadcrumbs + big title. */
export function PageHero({
  title,
  crumbs,
  note,
  children,
}: {
  title: string;
  crumbs: { href?: string; label: string }[];
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-brand relative overflow-hidden pt-32 pb-12 text-cream md:pt-40 md:pb-16">
      <svg aria-hidden="true" viewBox="0 0 1440 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-cream/12" fill="none">
        <path d="M-40 380 C 380 60, 1000 0, 1500 200" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="6 10" />
      </svg>
      <div className="wrap relative">
        <nav aria-label="breadcrumbs">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-cream/60">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                {c.href ? (
                  <Link href={c.href} className="link-draw hover:text-cream">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-cream/85">
                    {c.label}
                  </span>
                )}
                {i < crumbs.length - 1 && <span aria-hidden="true">/</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="display-lg mt-6 max-w-[18ch]">{title}</h1>
        {note && (
          <p className="mt-6 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-cream/15 bg-white/5 px-4 py-3 text-sm text-cream/75">
            <span className="mono-num mt-0.5 rounded bg-cream/90 px-1.5 text-[0.65rem] text-petrol-900 uppercase">demo</span>
            {note}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Chips for the filters in use; each one removes itself, plus "reset all". */
function ActiveFilters({ q, t, basePath, fixedCategory }: { q: CatalogQuery; t: T; basePath: string; fixedCategory?: string }) {
  const c = t.catalog;
  const without = (keys: string[]) => {
    const over: Record<string, undefined> = { page: undefined };
    for (const k of keys) over[k] = undefined;
    const qs = toSearchParams(q, over);
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chips: { label: string; href: string }[] = [];
  if (q.make) chips.push({ label: q.make === "kia" ? "Kia" : "Hyundai", href: without(["make", "model"]) });
  if (q.model) chips.push({ label: q.model, href: without(["model"]) });
  if (q.year) chips.push({ label: String(q.year), href: without(["year"]) });
  if (q.category && !fixedCategory) {
    chips.push({ label: t.categories.items.find((x) => x.slug === q.category)?.name ?? q.category, href: without(["category"]) });
  }
  if (q.minPrice != null || q.maxPrice != null) {
    const range = [q.minPrice != null ? `${c.from} ${q.minPrice.toLocaleString("ru-RU")}` : "", q.maxPrice != null ? `${c.to} ${q.maxPrice.toLocaleString("ru-RU")}` : ""].filter(Boolean).join(" ");
    chips.push({ label: range, href: without(["min", "max"]) });
  }
  if (q.availability) chips.push({ label: c.inStock, href: without(["stock"]) });
  if (!chips.length) return null;
  return (
    <ul className="mb-5 flex flex-wrap items-center gap-2" aria-label={c.filters}>
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            scroll={false}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-paper pr-2 pl-3.5 text-sm text-ink ring-1 ring-line transition-colors hover:bg-paper-2"
          >
            {chip.label}
            <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-paper-2 text-xs text-muted">×</span>
            <span className="sr-only">— {c.reset}</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={without(["make", "model", "year", "category", "min", "max", "stock"])} scroll={false} className="inline-flex h-9 items-center px-2 text-sm font-medium text-petrol-700 underline-offset-4 hover:underline">
          {c.reset}
        </Link>
      </li>
    </ul>
  );
}

function Pagination({ result, q, basePath, t }: { result: CatalogResult; q: CatalogQuery; basePath: string; t: T }) {
  if (result.pageCount <= 1) return null;
  const href = (p: number) => `${basePath}?${toSearchParams(q, { page: p > 1 ? String(p) : undefined })}`;
  return (
    <nav aria-label={t.catalog.page} className="mt-10 flex items-center justify-center gap-2">
      {result.page > 1 && (
        <Link href={href(result.page - 1)} className="inline-flex h-11 items-center rounded-full px-5 ring-1 ring-line hover:bg-paper">
          {t.catalog.prev}
        </Link>
      )}
      {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === result.page ? "page" : undefined}
          className={`grid size-11 place-items-center rounded-full ${p === result.page ? "bg-petrol-900 text-cream" : "ring-1 ring-line hover:bg-paper"}`}
        >
          {p}
        </Link>
      ))}
      {result.page < result.pageCount && (
        <Link href={href(result.page + 1)} className="inline-flex h-11 items-center rounded-full px-5 ring-1 ring-line hover:bg-paper">
          {t.catalog.next}
        </Link>
      )}
    </nav>
  );
}

export function EmptyState({ locale, t }: { locale: Locale; t: Dictionary["catalog"] }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] bg-paper px-6 py-16 text-center ring-1 ring-line">
      <p className="display-lg text-[clamp(1.8rem,3vw,2.6rem)] text-petrol-900">{t.emptyTitle}</p>
      <p className="mt-4 max-w-[42ch] text-ink-2">{t.emptyText}</p>
      <Link href={`/${locale}/contact?topic=fitment`} className="pill-cta on-light mt-8">
        <span className="pill-label">{t.askManager}</span>
        <span className="pill-circle" aria-hidden="true">
          <ArrowRight className="size-5" />
        </span>
      </Link>
    </div>
  );
}

/** Shared filtered listing used by /catalog, /categories/[slug] and /search. */
export function CatalogListing({
  locale,
  t,
  q,
  result,
  basePath,
  fixedCategory,
  hideFilters,
}: {
  locale: Locale;
  t: T;
  q: CatalogQuery;
  result: CatalogResult;
  basePath: string;
  fixedCategory?: string;
  hideFilters?: boolean;
}) {
  return (
    <section className="bg-paper-2 py-10 md:py-14">
      <div className={`wrap grid grid-cols-1 gap-8 ${hideFilters ? "" : "lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10"}`}>
        {!hideFilters && (
          <aside>
            <details className="group rounded-[22px] bg-paper p-5 ring-1 ring-line lg:sticky lg:top-28" open>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-lg font-medium text-petrol-900 lg:pointer-events-none [&::-webkit-details-marker]:hidden">
                {t.catalog.filters}
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180 lg:hidden">
                  ▾
                </span>
              </summary>
              <div className="mt-4">
                <FilterPanel q={q} c={t.catalog} categories={t.categories.items} basePath={basePath} fixedCategory={fixedCategory} />
              </div>
            </details>
          </aside>
        )}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {t.catalog.found}: <span className="font-medium text-ink">{result.total}</span>
            </p>
            {result.total > 1 && <SortSelect q={q} c={t.catalog} basePath={basePath} />}
          </div>
          {!hideFilters && <ActiveFilters q={q} t={t} basePath={basePath} fixedCategory={fixedCategory} />}
          {result.items.length === 0 ? (
            <EmptyState locale={locale} t={t.catalog} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} fitment={p.matchedFitment} locale={locale} t={t.catalog} />
                </li>
              ))}
            </ul>
          )}
          <Pagination result={result} q={q} basePath={basePath} t={t} />
        </div>
      </div>
    </section>
  );
}
