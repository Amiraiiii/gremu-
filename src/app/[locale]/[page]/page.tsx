import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { INFO_SLUGS, PENDING_LABEL, getInfoPage, type InfoSlug } from "@/content/info-pages";
import { PageHero } from "@/components/catalog/CatalogView";
import { ArrowRight } from "@/components/ui/icons";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => INFO_SLUGS.map((page) => ({ locale, page })));
}

type Props = { params: Promise<{ locale: string; page: string }> };

const isSlug = (s: string): s is InfoSlug => (INFO_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isSlug(page)) return {};
  const p = getInfoPage(locale, page);
  return {
    title: `${p.title} — gremu`,
    description: p.lead,
    alternates: { canonical: `/${locale}/${page}`, languages: { ru: `/ru/${page}`, uz: `/uz/${page}` } },
  };
}

export default async function InfoPage({ params }: Props) {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isSlug(page)) notFound();
  const p = getInfoPage(locale, page);
  const t = getDictionary(locale);
  const others = INFO_SLUGS.filter((s) => s !== page);

  return (
    <>
      <PageHero title={p.title} crumbs={[{ href: `/${locale}`, label: t.catalog.home }, { label: p.title }]}>
        <p className="mt-5 max-w-[56ch] text-lg text-cream/75">{p.lead}</p>
      </PageHero>

      <section className="bg-paper-2 py-14 md:py-20">
        <div className="wrap grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:gap-16">
          <div className="border-t border-line">
            {p.sections.map((s, i) => (
              <article key={s.heading} className="grid grid-cols-1 gap-3 border-b border-line py-8 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-6 md:py-10">
                <span className="mono-num text-sm text-petrol-600">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[clamp(1.4rem,2.4vw,1.9rem)] font-medium tracking-[-0.03em] text-petrol-900">{s.heading}</h2>
                    {s.pending && (
                      <span className="rounded-full bg-warn/12 px-2.5 py-0.5 text-xs font-medium text-[oklch(45%_0.12_70)] ring-1 ring-warn/35" data-assumed>
                        {PENDING_LABEL[locale]}
                      </span>
                    )}
                  </div>
                  {s.body.map((para) => (
                    <p key={para} className="mt-3 max-w-[62ch] text-ink-2">
                      {para}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <div className="bg-brand rounded-[22px] p-6 text-cream">
              <p className="text-xl font-medium tracking-[-0.02em]">{t.help.title}</p>
              <p className="mt-2 text-sm text-cream/70">{t.help.lead}</p>
              <Link href={`/${locale}/contact`} className="pill-cta mt-6">
                <span className="pill-label">{t.help.managerCta}</span>
                <span className="pill-circle" aria-hidden="true">
                  <ArrowRight className="size-5" />
                </span>
              </Link>
            </div>
            <nav aria-label={t.footer.info} className="rounded-[22px] bg-paper p-6 ring-1 ring-line">
              <ul>
                {others.map((s) => (
                  <li key={s}>
                    <Link href={`/${locale}/${s}`} className="flex min-h-11 items-center justify-between text-petrol-900">
                      <span className="link-draw">{getInfoPage(locale, s).title}</span>
                      <ArrowRight className="size-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </section>
    </>
  );
}
