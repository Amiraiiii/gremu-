import type { Metadata } from "next";
import Link from "next/link";
import { adminHashIsLegacy, requireAdmin } from "@/lib/auth/admin";
import { ORDER_STATUSES, listOrders } from "@/features/orders/admin";
import { AdminShell, PAYMENT_LABEL, STATUS_LABEL, StatusBadge } from "@/components/admin/AdminShell";
import { formatUZS } from "@/lib/format";
import { SearchIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заказы — gremu admin", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminOrders({ params, searchParams }: Props) {
  const { locale } = await params;
  const session = await requireAdmin(locale);
  const sp = await searchParams;
  const status = one(sp.status);
  const q = one(sp.q);
  const page = Number.parseInt(one(sp.page), 10) || 1;
  const data = await listOrders({ status, q, page });
  const all = Object.values(data.byStatus).reduce((s, n) => s + n, 0);

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const v = { status, q, ...over };
    for (const [k, val] of Object.entries(v)) if (val) p.set(k, String(val));
    const s = p.toString();
    return `/${locale}/admin${s ? `?${s}` : ""}`;
  };
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(d);

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role}>
      {session.role === "admin" && adminHashIsLegacy() && (
        <p role="note" className="mb-6 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
          Пароль владельца хранится в устаревшем формате хеша. Сгенерируйте новый: <code className="mono-num">npm run admin:hash -- &quot;длинный-пароль&quot;</code> и замените ADMIN_PASSWORD_HASH на сервере.
        </p>
      )}
      {one(sp.denied) && (
        <p role="alert" className="mb-6 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">Этот раздел доступен только администратору.</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">Заказы</h1>
          <p className="mt-1 text-sm text-muted">Всего: {all}</p>
        </div>
        <form action={`/${locale}/admin`} method="get" role="search" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="adm-q" className="sr-only">
            Номер, телефон или имя
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input id="adm-q" name="q" defaultValue={q} placeholder="Номер, телефон или имя" className="field w-64 pl-10" />
          </div>
          <button type="submit" className="h-12 rounded-full bg-petrol-900 px-5 text-sm font-medium text-cream">
            Найти
          </button>
        </form>
      </div>

      <nav aria-label="Фильтр по статусу" className="mt-6 flex flex-wrap gap-2">
        <Link
          href={href({ status: undefined, page: undefined })}
          aria-current={!status ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ${!status ? "bg-petrol-900 text-cream ring-petrol-900" : "bg-paper ring-line hover:bg-paper-2"}`}
        >
          Все <span className="mono-num opacity-70">{all}</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, page: undefined })}
            aria-current={status === s ? "page" : undefined}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ${status === s ? "bg-petrol-900 text-cream ring-petrol-900" : "bg-paper ring-line hover:bg-paper-2"}`}
          >
            {STATUS_LABEL[s]} <span className="mono-num opacity-70">{data.byStatus[s] ?? 0}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-[22px] bg-paper ring-1 ring-line">
        {data.rows.length === 0 ? (
          <p className="p-10 text-center text-ink-2">{q || status ? "Ничего не найдено по этому фильтру." : "Заказов пока нет."}</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs tracking-wider text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Номер</th>
                <th className="px-5 py-3 font-medium">Создан</th>
                <th className="px-5 py-3 font-medium">Клиент</th>
                <th className="px-5 py-3 font-medium">Сумма</th>
                <th className="px-5 py-3 font-medium">Статус</th>
                <th className="px-5 py-3 font-medium">Оплата</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                  <td className="px-5 py-3">
                    <Link href={`/${locale}/admin/orders/${o.orderNumber}`} className="mono-num font-medium text-petrol-800 underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-2">{fmtDate(o.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span className="block text-ink">{o.customerName}</span>
                    <span className="mono-num text-xs text-muted">{o.customerPhone}</span>
                  </td>
                  <td className="px-5 py-3 font-medium whitespace-nowrap text-ink">{formatUZS(o.totalMinor, "ru")}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-2">{PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.pageCount > 1 && (
        <nav aria-label="Страницы" className="mt-6 flex justify-center gap-2">
          {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={href({ page: p > 1 ? p : undefined })}
              aria-current={p === data.page ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-full ${p === data.page ? "bg-petrol-900 text-cream" : "bg-paper ring-1 ring-line"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </AdminShell>
  );
}
