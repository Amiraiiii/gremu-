import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PageHero } from "@/components/catalog/CatalogView";
import { CartView } from "@/components/cart/CartView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${getDictionary(locale).cart.title} — gremu`, robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <>
      <PageHero title={t.cart.title} crumbs={[{ href: `/${locale}`, label: t.catalog.home }, { label: t.cart.title }]} />
      <section className="bg-paper-2 py-10 md:py-14">
        <div className="wrap">
          <CartView locale={locale} t={{ cart: t.cart, catalog: t.catalog }} />
        </div>
      </section>
    </>
  );
}
