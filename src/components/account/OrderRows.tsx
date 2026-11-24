import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { formatDate, formatUZS } from "@/lib/format";

type Row = { orderNumber: string; createdAt: Date; totalMinor: number; status: string; paymentStatus: string };

const TONE: Record<string, string> = {
  completed: "bg-ok/12 text-ok ring-ok/25",
  cancelled: "bg-bad/10 text-bad ring-bad/25",
};

/** A two-column list on phones, a table-like grid from md up; every row links to the order. */
export function OrderRows({ locale, orders, t }: { locale: Locale; orders: Row[]; t: Dictionary }) {
  const a = t.account.orders;
  const st = (s: string) => (t.order.statuses as Record<string, string>)[s] ?? s;
  const ps = (s: string) => (t.order.paymentStatuses as Record<string, string>)[s] ?? s;
  return (
    <ul className="mt-5 divide-y divide-line">
      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link
            href={`/${locale}/account/orders/${o.orderNumber}`}
            className="grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-xl py-4 md:grid-cols-[1.3fr_1fr_1fr_auto] md:px-2 md:hover:bg-paper-2"
          >
            <span>
              <span className="mono-num block font-medium text-petrol-800">{o.orderNumber}</span>
              <span className="block text-sm text-muted">{formatDate(o.createdAt.toISOString(), locale)}</span>
            </span>
            <span className="mono-num text-right text-ink md:text-left">{formatUZS(o.totalMinor, locale)}</span>
            <span className="text-sm text-ink-2">
              <span className="sr-only">{a.payment}: </span>
              {ps(o.paymentStatus)}
            </span>
            <span
              className={`justify-self-end rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                TONE[o.status] ?? "bg-petrol-700/8 text-petrol-800 ring-petrol-700/20"
              }`}
            >
              <span className="sr-only">{a.status}: </span>
              {st(o.status)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
