import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getCatalogDictionary } from "@/features/catalog/categories";
import { Hero } from "@/components/home/Hero";
import { FloatingCta, Journey, Statement } from "@/components/home/Moments";
import { Categories, Faq, FinderSection, PartTypes } from "@/components/home/Sections";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getCatalogDictionary(locale);

  return (
    <>
      <Hero t={{ hero: t.hero, bands: t.heroBands }} />
      <Categories locale={locale} t={t.categories} />
      <Statement lines={t.statement} />
      <Journey title={t.journey.title} steps={t.journey.steps} lead={t.howTo.lead} />
      <FinderSection locale={locale} t={{ finder: t.finder, hero: t.hero, howTo: t.howTo }} />
      <PartTypes t={t.partTypes} />
      <FloatingCta
        title={t.help.title}
        accent={t.help.titleAccent}
        lead={t.help.ctaLead}
        cta={t.help.ctaPrimary}
        href="#finder"
      />
      <Faq t={t.faq} />
    </>
  );
}
