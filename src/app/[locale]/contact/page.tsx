import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PageHero } from "@/components/catalog/CatalogView";
import { ContactForm } from "@/components/contact/ContactForm";

// Topic and SKU are prefilled from the URL, so render per request.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: `${t.contact.title} — gremu`, description: t.contact.lead };
}

const TOPICS = ["general", "fitment", "order", "other"] as const;

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const topicRaw = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic;
  const topic = TOPICS.find((x) => x === topicRaw);
  const skuRaw = (Array.isArray(sp.sku) ? sp.sku[0] : sp.sku)?.slice(0, 40);

  return (
    <>
      <PageHero title={t.contact.title} crumbs={[{ href: `/${locale}`, label: t.catalog.home }, { label: t.nav.contacts }]}>
        <p className="mt-5 max-w-[56ch] text-lg text-cream/75">{t.contact.lead}</p>
      </PageHero>
      <section className="bg-paper-2 py-12 md:py-16">
        <div className="wrap grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-12">
          <ContactForm locale={locale} t={t.contact} initialTopic={topic} initialSku={skuRaw} />
          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[22px] bg-paper p-6 ring-1 ring-line">
              <h2 className="text-xl font-medium tracking-[-0.02em] text-petrol-900">{t.contact.channels}</h2>
              {/* TODO(client): phone, address, hours, Telegram/Instagram once confirmed */}
              <p className="mt-3 text-ink-2" data-assumed>
                {t.contact.channelsPending}
              </p>
            </div>
            <div className="bg-brand rounded-[22px] p-6 text-cream">
              <p className="text-lg font-medium">{t.help.aiTitle}</p>
              <p className="mt-2 text-sm text-cream/70">{t.help.aiText}</p>
              <span className="mt-4 inline-flex rounded-full border border-cream/25 px-3 py-1 text-xs text-cream/75">{t.help.aiSoon}</span>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
