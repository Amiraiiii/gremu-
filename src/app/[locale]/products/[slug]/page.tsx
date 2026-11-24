import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getCatalogDictionary } from "@/features/catalog/categories";
import { catalog } from "@/features/catalog/repository";
import { formatDate, formatUZS } from "@/lib/format";
import { PageHero } from "@/components/catalog/CatalogView";
import { ProductCard, ProductVisual } from "@/components/catalog/ProductCard";
import { AddToCart } from "@/components/catalog/AddToCart";
import { AvailabilityBadge, DemoBadge, FitmentBadge } from "@/components/catalog/Badges";
import { ArrowRight } from "@/components/ui/icons";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await catalog.getBySlug(slug);
  if (!p) return {};
  const title = `${p.title[locale]} — ${p.sku} — gremu`;
  return {
    title,
    description: p.description[locale],
    alternates: { canonical: `/${locale}/products/${slug}`, languages: { ru: `/ru/products/${slug}`, uz: `/uz/products/${slug}` } },
    openGraph: { title, description: p.description[locale], type: "website" },
    robots: p.isDemo ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = await catalog.getBySlug(slug);
  if (!product) notFound();
  const t = await getCatalogDictionary(locale);
  const c = t.catalog;
  const cat = t.categories.items.find((x) => x.slug === product.categorySlug);
  const related = (await catalog.search({ category: product.categorySlug })).items.filter((p) => p.id !== product.id).slice(0, 3);
  const make = product.vehicleMake === "hyundai" ? "Hyundai" : "Kia";

  return (
    <>
      <PageHero
        title={product.title[locale]}
        crumbs={[
          { href: `/${locale}`, label: c.home },
          { href: `/${locale}/catalog`, label: c.title },
          ...(cat ? [{ href: `/${locale}/categories/${cat.slug}`, label: cat.name }] : []),
          { label: product.sku },
        ]}
        note={product.isDemo ? c.demoNote : undefined}
      />

      <section className="bg-paper-2 py-10 md:py-14">
        <div className="wrap grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          {/* Visual */}
          <div className="group">
            <div className="relative">
              <ProductVisual product={product} className="aspect-[4/3] rounded-[26px]" priority />
              <div className="absolute top-4 left-4 flex gap-1.5">
                {product.isDemo && <DemoBadge label={c.demo} />}
              </div>
            </div>
          </div>

          {/* Buy box */}
          <div className="flex flex-col gap-6 rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-petrol-900 px-3 py-1 text-xs font-medium text-cream">{c.types[product.partType]}</span>
              <span className="rounded-full px-3 py-1 text-xs text-ink-2 ring-1 ring-line">{make}</span>
            </div>
            <dl className="mono-num grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">{c.sku}</dt>
              <dd className="text-ink">{product.sku}</dd>
              <dt className="text-muted">{c.oem}</dt>
              <dd className="text-ink">{product.oemNumber ?? c.unknown}</dd>
              <dt className="text-muted">{c.manufacturer}</dt>
              <dd className="font-sans text-ink">{product.manufacturer}</dd>
            </dl>
            <div className="border-t border-line pt-6">
              <p className="text-[clamp(2rem,4vw,2.8rem)] leading-none font-medium tracking-[-0.04em] text-petrol-900">
                {formatUZS(product.priceMinor, locale)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <AvailabilityBadge value={product.availability} label={c.availability[product.availability]} />
                <span className="text-xs text-muted">
                  {c.updated}: {formatDate(product.updatedAt, locale)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <AddToCart
                productId={product.id}
                disabled={product.availability === "out_of_stock"}
                labels={{ add: c.addToCart, added: c.added }}
                size="lg"
              />
              <Link
                href={`/${locale}/contact?topic=fitment&sku=${encodeURIComponent(product.sku)}`}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full px-6 font-medium whitespace-nowrap text-petrol-900 ring-1 ring-line transition-colors hover:bg-paper-2"
              >
                {c.checkFit}
                <ArrowRight className="size-4" />
              </Link>
              <span className="inline-flex h-14 items-center justify-center rounded-full px-5 text-sm text-muted ring-1 ring-line ring-dashed" aria-disabled="true">
                {c.askAi} · {c.soon}
              </span>
            </div>
            <div className="grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">{c.delivery}</p>
                <p className="mt-1 text-ink-2" data-assumed>
                  {c.deliveryText}
                </p>
              </div>
              <div>
                <p className="font-medium text-ink">{c.warranty}</p>
                <p className="mt-1 text-ink-2" data-assumed>
                  {c.warrantyText}
                </p>
              </div>
            </div>
          </div>

          {/* Fitment */}
          <div className="rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8 lg:col-start-1">
            <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{c.applicability}</h2>
            {product.fitments.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs tracking-wider text-muted uppercase">
                    <tr className="border-b border-line">
                      <th className="py-3 pr-4 font-medium">{c.vehicle}</th>
                      <th className="py-3 pr-4 font-medium">{c.years}</th>
                      <th className="py-3 pr-4 font-medium">{c.engine}</th>
                      <th className="py-3 font-medium">{c.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.fitments.map((f, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-3 pr-4 text-ink">
                          {f.make === "hyundai" ? "Hyundai" : "Kia"} {f.model}
                        </td>
                        <td className="mono-num py-3 pr-4 text-ink-2">
                          {f.yearFrom}–{f.yearTo}
                        </td>
                        <td className="py-3 pr-4 text-ink-2">{f.engine ?? c.unknown}</td>
                        <td className="py-3">
                          <FitmentBadge status={f.status} label={c.fitment[f.status]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-ink-2">{c.noFitment}</p>
            )}

            <h2 className="mt-10 text-2xl font-medium tracking-[-0.03em] text-petrol-900">{c.description}</h2>
            <p className="mt-3 max-w-[62ch] text-ink-2">{product.description[locale]}</p>

            {product.specs.length > 0 && (
              <>
                <h2 className="mt-10 text-2xl font-medium tracking-[-0.03em] text-petrol-900">{c.specs}</h2>
                <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-line text-sm">
                  {product.specs.map((s) => (
                    <div key={s.label.ru} className="contents">
                      <dt className="border-b border-line py-3 text-muted">{s.label[locale]}</dt>
                      <dd className="border-b border-line py-3 text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-paper py-14 md:py-20">
          <div className="wrap">
            <h2 className="display-lg text-[clamp(1.8rem,3.4vw,3rem)] text-petrol-900">{c.related}</h2>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} locale={locale} t={c} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
