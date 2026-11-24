import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { TRANSITIONS, getOrderAdmin, isStatus } from "@/features/orders/admin";
import { DELIVERY_METHODS, PAYMENT_METHODS, REGIONS } from "@/config/shop";
import { AdminShell, PAYMENT_LABEL, STATUS_LABEL, StatusBadge } from "@/components/admin/AdminShell";
import { StatusForm } from "@/components/admin/StatusForm";
import { formatUZS } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заказ — gremu admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string; number: string }> };

const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(d);

export default async function AdminOrder({ params }: Props) {
  const { locale, number } = await params;
  const session = await requireAdmin(locale);
  const data = /^GR-\d{6}-[A-Z0-9]{4}$/.test(number) ? await getOrderAdmin(number) : null;
  if (!data) notFound();
  const { order, items, history, audit } = data;
  const delivery = DELIVERY_METHODS.find((d) => d.code === order.deliveryMethod);
  const payment = PAYMENT_METHODS.find((p) => p.code === order.paymentMethod);
  const region = REGIONS.find((r) => r.code === order.region);
  const next = isStatus(order.status) ? TRANSITIONS[order.status] : [];
  const card = "rounded-[22px] bg-paper p-6 ring-1 ring-line";

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role}>
      <Link href={`/${locale}/admin`} className="text-sm text-ink-2 hover:text-ink">
        ← Все заказы
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="mono-num text-3xl text-petrol-900">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">{fmt(order.createdAt)}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <div className="grid gap-6">
          <section className={card} aria-labelledby="items-h">
            <h2 id="items-h" className="text-xl font-medium text-petrol-900">
              Состав заказа
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs tracking-wider text-muted uppercase">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 font-medium">Товар</th>
                    <th className="py-2 pr-4 font-medium">Цена</th>
                    <th className="py-2 pr-4 font-medium">Кол-во</th>
                    <th className="py-2 text-right font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-4">
                        <span className="block text-ink">{i.productTitleSnapshot}</span>
                        <span className="mono-num text-xs text-muted">
                          {i.skuSnapshot}
                          {i.oemSnapshot ? ` · OEM ${i.oemSnapshot}` : ""}
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-ink-2">{formatUZS(i.unitPriceMinor, "ru")}</td>
                      <td className="mono-num py-3 pr-4 text-ink">{i.quantity}</td>
                      <td className="py-3 text-right font-medium whitespace-nowrap text-ink">{formatUZS(i.lineTotalMinor, "ru")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid gap-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-2">Товары</dt>
                <dd>{formatUZS(order.subtotalMinor, "ru")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Доставка</dt>
                <dd>{delivery?.feeMinor == null ? "согласуется" : formatUZS(order.deliveryFeeMinor, "ru")}</dd>
              </div>
              <div className="mt-2 flex justify-between text-lg font-medium text-petrol-900">
                <dt>Итого</dt>
                <dd>{formatUZS(order.totalMinor, "ru")}</dd>
              </div>
            </dl>
          </section>

          <section className={card} aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-xl font-medium text-petrol-900">
              История статусов
            </h2>
            <ol className="mt-4 grid gap-3">
              {history.map((h) => (
                <li key={h.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-sm">
                  <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-petrol-600" />
                  <div>
                    <p>
                      <span className="font-medium text-ink">{STATUS_LABEL[h.status] ?? h.status}</span>
                      <span className="text-muted">
                        {" "}
                        · {fmt(h.createdAt)} · {h.actor}
                      </span>
                    </p>
                    {h.note && <p className="mt-0.5 text-ink-2">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={card} aria-labelledby="audit-h">
            <h2 id="audit-h" className="text-xl font-medium text-petrol-900">
              Журнал действий
            </h2>
            {audit.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {audit.map((a) => (
                  <li key={a.id} className="text-ink-2">
                    <span className="text-muted">{fmt(a.createdAt)}</span> · {a.actor} · <span className="mono-num">{a.action}</span>
                    {a.metadata && <span className="mono-num text-xs text-muted"> {a.metadata}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Действий сотрудников пока нет.</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className={card} aria-labelledby="status-h">
            <h2 id="status-h" className="text-xl font-medium text-petrol-900">
              Статус
            </h2>
            <p className="mt-1 mb-4 text-sm text-ink-2">
              Сейчас: {STATUS_LABEL[order.status]} · Оплата: {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </p>
            <StatusForm
              locale={locale}
              number={order.orderNumber}
              current={order.status}
              options={next.map((s) => ({ value: s, label: STATUS_LABEL[s], danger: s === "cancelled" }))}
            />
          </section>

          <section className={card} aria-labelledby="cust-h">
            <h2 id="cust-h" className="text-xl font-medium text-petrol-900">
              Клиент
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-muted">Имя</dt>
                <dd className="text-ink">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted">Телефон</dt>
                <dd>
                  <a href={`tel:${order.customerPhone.replace(/[^\d+]/g, "")}`} className="mono-num text-petrol-800 underline-offset-4 hover:underline">
                    {order.customerPhone}
                  </a>
                </dd>
              </div>
              {order.customerEmail && (
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="text-ink">{order.customerEmail}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Получение</dt>
                <dd className="text-ink">
                  {delivery?.label.ru ?? order.deliveryMethod}
                  <br />
                  <span className="text-ink-2">{[region?.ru, order.city, order.addressLine].filter(Boolean).join(", ")}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Оплата</dt>
                <dd className="text-ink">{payment?.label.ru ?? order.paymentMethod}</dd>
              </div>
              {order.customerNote && (
                <div>
                  <dt className="text-muted">Комментарий клиента</dt>
                  <dd className="whitespace-pre-line text-ink">{order.customerNote}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Язык клиента</dt>
                <dd className="text-ink uppercase">{order.locale}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
