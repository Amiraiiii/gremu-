import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { isPayable } from "@/features/payments";
import { payme } from "@/features/payments/payme/config";

type Order = { orderNumber: string; status: string; paymentMethod: string; paymentStatus: string };

/**
 * Pay button for online-payment orders. It only opens Payme; the status shown comes from the
 * database, which changes only after Payme's verified server callback.
 */
export function PayBlock({ locale, order, token, t }: { locale: Locale; order: Order; token?: string; t: Dictionary["order"]["pay"] }) {
  if (order.paymentMethod !== "payme") return null;
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  if (order.paymentStatus === "paid") {
    return <p className={`${card} text-sm font-medium text-ok`}>{t.paid}</p>;
  }
  if (!isPayable(order)) return null;

  return (
    <div className={card}>
      {order.paymentStatus === "pending" && (
        <p role="status" className="mb-4 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
          {t.pending}
        </p>
      )}
      <form method="post" action="/api/payments/payme/start">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="number" value={order.orderNumber} />
        {token ? <input type="hidden" name="t" value={token} /> : null}
        <button type="submit" className="btn btn-primary w-full">
          {order.paymentStatus === "unpaid" ? t.button : t.retry}
        </button>
      </form>
      <p className="mt-3 text-xs text-muted">{t.hint}</p>
      {payme.mode() === "test" && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-2">
          <span className="mono-num rounded bg-petrol-700 px-1.5 text-[0.65rem] text-cream uppercase">test</span>
          {t.testMode}
        </p>
      )}
    </div>
  );
}
