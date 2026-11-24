import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { listUserOrders } from "@/features/account/service";
import { PAYMENT_METHODS } from "@/config/shop";
import { formatDate, formatUZS } from "@/lib/format";

/** Until a payment provider is connected (stage 7) the history is the payment status of each order. */
export default async function AccountPayments({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/payments`);
  const t = getDictionary(locale);
  const p = t.account.payments;
  const orders = await listUserOrders(user.id);
  const ps = (s: string) => (t.order.paymentStatuses as Record<string, string>)[s] ?? s;
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
      <div className={card}>
        <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{p.title}</h2>
        <p className="mt-3 max-w-[60ch] text-sm text-ink-2">{p.lead}</p>
        {orders.length ? (
          <ul className="mt-6 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.orderNumber} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4">
                <span>
                  <Link href={`/${locale}/account/orders/${o.orderNumber}`} className="link-draw mono-num font-medium text-petrol-800">
                    {o.orderNumber}
                  </Link>
                  <span className="block text-sm text-muted">
                    {formatDate(o.createdAt.toISOString(), locale)} ·{" "}
                    {PAYMENT_METHODS.find((m) => m.code === o.paymentMethod)?.label[locale] ?? o.paymentMethod}
                  </span>
                </span>
                <span className="text-right">
                  <span className="mono-num block text-ink">{formatUZS(o.totalMinor, locale)}</span>
                  <span className="block text-sm text-ink-2">{ps(o.paymentStatus)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-ink-2">{p.empty}</p>
        )}
      </div>
      <div className={`${card} h-max`}>
        <h2 className="text-lg font-medium text-petrol-900">{p.saved}</h2>
        <p className="mt-3 text-sm text-ink-2">{p.savedText}</p>
      </div>
    </div>
  );
}
