import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PageHero } from "@/components/catalog/CatalogView";
import { CheckoutForm, type CheckoutPrefill } from "@/components/checkout/CheckoutForm";
import { getCurrentUser } from "@/lib/auth/user";
import { listAddresses } from "@/features/account/service";
import { availablePaymentMethods } from "@/features/payments";

// Signed-in customers get their profile and default address pre-filled, so render per request.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${getDictionary(locale).checkout.title} — gremu`, robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  let prefill: CheckoutPrefill | undefined;
  if (user) {
    const address = (await listAddresses(user.id))[0]; // default address sorts first
    prefill = {
      name: address?.recipientName ?? user.fullName ?? "",
      phone: address?.phone ?? user.phone ?? "",
      email: user.email ?? "",
      region: address?.region ?? "",
      city: address?.city ?? "",
      address: address?.addressLine ?? "",
    };
  }
  return (
    <>
      <PageHero
        title={t.checkout.title}
        crumbs={[
          { href: `/${locale}`, label: t.catalog.home },
          { href: `/${locale}/cart`, label: t.cart.title },
          { label: t.checkout.title },
        ]}
      />
      <section className="bg-paper-2 py-10 md:py-14">
        <div className="wrap">
          <CheckoutForm locale={locale} t={{ checkout: t.checkout, cart: t.cart }} prefill={prefill} paymentMethods={availablePaymentMethods()} />
        </div>
      </section>
    </>
  );
}
