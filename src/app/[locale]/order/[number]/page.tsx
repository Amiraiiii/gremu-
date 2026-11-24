import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getOrderForGuest } from "@/features/orders/service";
import { DELIVERY_METHODS, PAYMENT_METHODS, REGIONS } from "@/config/shop";
import { formatDate, formatUZS } from "@/lib/format";
import { CopyLink } from "@/components/checkout/CopyLink";
import { PayBlock } from "@/components/checkout/PayBlock";

// Private, token-protected page: render per request, never index, never leak the URL.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${getDictionary(locale).order.title} — gremu`, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const o = t.order;
  const sp = await searchParams;
  const token = (Array.isArray(sp.t) ? sp.t[0] : sp.t) ?? "";
  const data = /^GR-\d{6}-[A-Z0-9]{4}$/.test(number) ? await getOrderForGuest(number, token) : null;

  if (!data) {
    return (
      <section className="bg-brand flex min-h-[70svh] items-center text-cream">
        <div className="wrap py-32">
          <h1 className="display-lg max-w-[16ch]">{o.notFoundTitle}</h1>
          <p className="mt-6 max-w-[48ch] text-lg text-cream/75">{o.notFoundText}</p>
          <Link href={`/${locale}/contact?topic=order`} className="pill-cta mt-8">
            <span className="pill-label">{t.help.managerCta}</span>
          </Link>
        </div>
      </section>
    );
  }

  const { order, items, history } = data;
  const delivery = DELIVERY_METHODS.find((d) => d.code === order.deliveryMethod);
  const payment = PAYMENT_METHODS.find((p) => p.code === order.paymentMethod);
  const region = REGIONS.find((r) => r.code === order.region);
  const hasDemo = items.some((i) => i.skuSnapshot.includes("DEMO"));
  const st = (s: string) => (o.statuses as Record<string, string>)[s] ?? s;
  const ps = (s: string) => (o.paymentStatuses as Record<string, string>)[s] ?? s;
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <>
      <section className="bg-brand relative overflow-hidden pt-32 pb-14 text-cream md:pt-40 md:pb-20">
        <div className="wrap">
          <span className="grid size-14 place-items-center rounded-full bg-glow/20 text-glow">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="display-lg mt-6">{o.title}</h1>
          <p className="mt-4 text-cream/70">{o.number}</p>
          <p className="mono-num mt-1 text-[clamp(1.6rem,4vw,2.6rem)] tracking-wide text-cream">{order.orderNumber}</p>
          <p className="mt-6 max-w-[52ch] text-lg text-cream/80">{o.thanks}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CopyLink label={o.copyLink} done={o.copied} />
            <span className="text-sm text-cream/60">{o.saveLink}</span>
          </div>
        </div>
      </section>

      <section className="bg-paper-2 py-10 md:py-14">
        <div className="wrap grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
          <div className="grid gap-6">
            {hasDemo && <p className="rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">{o.demoNote}</p>}
            <div className={card}>
              <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{o.items}</h2>
              <ul className="mt-5 grid gap-3">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block text-ink">{i.productTitleSnapshot}</span>
                      <span className="mono-num text-xs text-muted">
                        {i.skuSnapshot}
                        {i.oemSnapshot ? ` · OEM ${i.oemSnapshot}` : ""} · {i.quantity} {o.qty} × {formatUZS(i.unitPriceMinor, locale)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium whitespace-nowrap text-ink">{formatUZS(i.lineTotalMinor, locale)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
                <span className="text-ink-2">{t.checkout.total}</span>
                <span className="text-[1.9rem] leading-none font-medium tracking-[-0.04em] text-petrol-900">{formatUZS(order.totalMinor, locale)}</span>
              </div>
              {delivery?.feeMinor == null && <p className="mt-2 text-right text-xs text-muted">{t.checkout.delivery}: {t.checkout.deliveryAgreed}</p>}
            </div>

            <div className={card}>
              <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{o.history}</h2>
              <ol className="mt-5 grid gap-3">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <span aria-hidden="true" className="size-2 rounded-full bg-petrol-600" />
                    <span className="text-ink">{st(h.status)}</span>
                    <span className="text-muted">{formatDate(h.createdAt.toISOString(), locale)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-28 lg:self-start">
            <PayBlock locale={locale} order={order} token={token} t={o.pay} />
            <dl className={`${card} grid gap-4 text-sm`}>
              <div>
                <dt className="text-muted">{o.status}</dt>
                <dd className="mt-1 text-lg font-medium text-petrol-900">{st(order.status)}</dd>
              </div>
              <div>
                <dt className="text-muted">{o.payment}</dt>
                <dd className="mt-1 text-ink">
                  {ps(order.paymentStatus)} · {payment?.label[locale]}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{o.receiving}</dt>
                <dd className="mt-1 text-ink">
                  {delivery?.label[locale]}
                  <br />
                  <span className="text-ink-2">{[region?.[locale], order.city, order.addressLine].filter(Boolean).join(", ")}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">{o.contacts}</dt>
                <dd className="mt-1 text-ink">
                  {order.customerName}
                  <br />
                  <span className="text-ink-2">{order.customerPhone}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">{o.created}</dt>
                <dd className="mt-1 text-ink">{formatDate(order.createdAt.toISOString(), locale)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
