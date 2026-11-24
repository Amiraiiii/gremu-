import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { toSearchParams } from "@/features/catalog/query";
import type { CatalogQuery, CatalogResult } from "@/features/catalog/types";
import { DEMO_MODELS } from "@/components/home/vehicle-data";
import { YEARS } from "@/components/home/vehicle-data";
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

function Filters({ q, t, basePath, fixedCategory }: { q: CatalogQuery; t: T; basePath: string; fixedCategory?: string }) {
  const c = t.catalog;
  const label = "mb-1.5 block text-xs font-medium tracking-wider text-muted uppercase";
  return (
    <form action={basePath} method="get" className="grid gap-5">
      {q.q && <input type="hidden" name="q" value={q.q} />}
      <fieldset>
        <legend className={label}>{c.make}</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { v: "", l: c.anyMake },
            { v: "hyundai", l: "Hyundai" },
            { v: "kia", l: "Kia" },
          ].map((o) => (
            <label
              key={o.v}
              className="flex h-11 cursor-pointer items-center justify-center rounded-full text-sm ring-1 ring-line transition-colors has-[:checked]:bg-petrol-900 has-[:checked]:text-cream has-[:checked]:ring-petrol-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
            >
              <input type="radio" name="make" value={o.v} defaultChecked={(q.make ?? "") === o.v} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="f-model" className={label}>
          {c.model}
        </label>
        <select id="f-model" name="model" defaultValue={q.model ?? ""} className="field">
          <option value="">{c.anyModel}</option>
          <optgroup label="Hyundai">
            {DEMO_MODELS.hyundai.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </optgroup>
          <optgroup label="Kia">
            {DEMO_MODELS.kia.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <div>
        <label htmlFor="f-year" className={label}>
          {c.year}
        </label>
        <select id="f-year" name="year" defaultValue={q.year ?? ""} className="field">
          <option value="">{c.anyYear}</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {!fixedCategory && (
        <div>
          <label htmlFor="f-cat" className={label}>
            {c.category}
          </label>
          <select id="f-cat" name="category" defaultValue={q.category ?? ""} className="field">
            <option value="">{c.allCategories}</option>
            {t.categories.items.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="f-type" className={label}>
          {c.partType}
        </label>
        <select id="f-type" name="type" defaultValue={q.partType ?? ""} className="field">
          <option value="">{c.anyType}</option>
          {(Object.keys(c.types) as (keyof typeof c.types)[]).map((k) => (
            <option key={k} value={k}>
              {c.types[k]}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className={label}>{c.price}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="min" inputMode="numeric" pattern="[0-9]*" placeholder={c.from} aria-label={`${c.price} ${c.from}`} defaultValue={q.minPrice ?? ""} className="field" />
          <input name="max" inputMode="numeric" pattern="[0-9]*" placeholder={c.to} aria-label={`${c.price} ${c.to}`} defaultValue={q.maxPrice ?? ""} className="field" />
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="stock" value="1" defaultChecked={q.availability === "in_stock"} className="size-5 accent-[var(--petrol-700)]" />
        {c.inStock}
      </label>
      <div>
        <label htmlFor="f-sort" className={label}>
          {c.sort}
        </label>
        <select id="f-sort" name="sort" defaultValue={q.sort ?? "relevance"} className="field">
          {(Object.keys(c.sorts) as (keyof typeof c.sorts)[]).map((k) => (
            <option key={k} value={k}>
              {c.sorts[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-petrol-900 font-medium text-cream transition-colors hover:bg-petrol-700">
          {c.apply}
        </button>
        <Link href={basePath} className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm text-ink-2 ring-1 ring-line hover:bg-paper">
          {c.reset}
        </Link>
      </div>
    </form>
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
                <Filters q={q} t={t} basePath={basePath} fixedCategory={fixedCategory} />
              </div>
            </details>
          </aside>
        )}
        <div>
          <p className="mb-5 text-sm text-muted" aria-live="polite">
            {t.catalog.found}: <span className="font-medium text-ink">{result.total}</span>
          </p>
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
