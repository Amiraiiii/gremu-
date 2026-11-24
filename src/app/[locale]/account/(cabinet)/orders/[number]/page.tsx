import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { getUserOrder } from "@/features/account/service";
import { DELIVERY_METHODS, PAYMENT_METHODS, REGIONS } from "@/config/shop";
import { formatDate, formatUZS } from "@/lib/format";
import { PayBlock } from "@/components/checkout/PayBlock";

export default async function AccountOrder({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  if (!isLocale(locale) || !/^GR-\d{6}-[A-Z0-9]{4}$/.test(number)) notFound();
  const user = await requireUser(locale, `/${locale}/account/orders/${number}`);
  const data = await getUserOrder(user.id, number);
  if (!data) notFound(); // someone else's order looks exactly like a missing one

  const t = getDictionary(locale);
  const o = t.order;
  const { order, items, history } = data;
  const st = (s: string) => (o.statuses as Record<string, string>)[s] ?? s;
  const ps = (s: string) => (o.paymentStatuses as Record<string, string>)[s] ?? s;
  const delivery = DELIVERY_METHODS.find((d) => d.code === order.deliveryMethod);
  const payment = PAYMENT_METHODS.find((p) => p.code === order.paymentMethod);
  const region = REGIONS.find((r) => r.code === order.region);
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <div className="grid gap-6">
      <Link href={`/${locale}/account/orders`} className="link-draw w-max text-sm font-medium text-petrol-700">
        ← {t.account.orders.back}
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
        <div className={card}>
          <p className="text-sm text-muted">{o.number}</p>
          <p className="mono-num mt-1 text-2xl tracking-wide text-petrol-900">{order.orderNumber}</p>
          <h2 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-petrol-900">{o.items}</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{i.productTitleSnapshot}</span>
                  <span className="mono-num block text-sm text-muted">
                    {i.skuSnapshot}
                    {i.oemSnapshot ? ` · OEM ${i.oemSnapshot}` : ""}
                  </span>
                </span>
                <span className="mono-num text-ink-2">
                  {i.quantity} {o.qty} · {formatUZS(i.lineTotalMinor, locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-line pt-4 text-lg font-medium text-ink">
            <span>{t.account.orders.total}</span>
            <span className="mono-num">{formatUZS(order.totalMinor, locale)}</span>
          </p>
        </div>

        <div className="grid content-start gap-6">
          <PayBlock locale={locale} order={order} t={o.pay} />
          <div className={card}>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-muted">{o.status}</dt>
                <dd className="mt-1 font-medium text-ink">{st(order.status)}</dd>
              </div>
              <div>
                <dt className="text-muted">{o.payment}</dt>
                <dd className="mt-1 font-medium text-ink">
                  {ps(order.paymentStatus)}
                  {payment ? <span className="block font-normal text-ink-2">{payment.label[locale]}</span> : null}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{o.receiving}</dt>
                <dd className="mt-1 text-ink">
                  {delivery?.label[locale]}
                  <span className="block text-ink-2">{[region?.[locale], order.city, order.addressLine].filter(Boolean).join(", ")}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">{o.created}</dt>
                <dd className="mt-1 text-ink">{formatDate(order.createdAt.toISOString(), locale)}</dd>
              </div>
            </dl>
          </div>
          <div className={card}>
            <h2 className="text-lg font-medium text-petrol-900">{o.history}</h2>
            <ol className="mt-4 grid gap-3 border-l border-line pl-4 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="font-medium text-ink">{st(h.status)}</span>
                  <span className="block text-muted">{formatDate(h.createdAt.toISOString(), locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
