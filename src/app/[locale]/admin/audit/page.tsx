import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { SearchIcon } from "@/components/ui/icons";
import { listAudit } from "@/features/catalog/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Журнал — gremu admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const ENTITIES: Record<string, string> = { order: "Заказы", product: "Товары", category: "Категории", brand: "Бренды", inquiry: "Обращения", session: "Входы" };
const ACTIONS: Record<string, string> = {
  "admin.login": "Вход в админку",
  "admin.login_failed": "Неудачный вход",
  "order.status_changed": "Статус заказа",
  "payment.paid": "Оплата получена (Payme)",
  "payment.refunded": "Возврат оплаты (Payme)",
  "product.create": "Товар создан",
  "product.update": "Товар изменён",
  "product.quick_update": "Цена/остаток/публикация",
  "product.delete": "Товар удалён",
  "catalog.csv_import": "Импорт CSV",
  "category.create": "Категория создана",
  "category.update": "Категория изменена",
  "category.delete": "Категория удалена",
  "brand.create": "Бренд создан",
  "brand.update": "Бренд переименован",
  "brand.delete": "Бренд удалён",
  "inquiry.status": "Статус обращения",
  "inquiry.email_resend": "Повтор письма по обращению",
  "inquiry.email_retry_all": "Повтор всех писем",
};

/** Metadata is stored as JSON; show it compactly ("price: 420000 → 450000"). */
function describe(meta: string | null): string {
  if (!meta) return "";
  try {
    const m = JSON.parse(meta) as Record<string, unknown>;
    const changes = (m.changes ?? null) as Record<string, [unknown, unknown]> | null;
    if (changes) {
      return Object.entries(changes)
        .map(([k, [a, b]]) => (k === "priceMinor" ? `цена: ${Math.round(Number(a) / 100)} → ${Math.round(Number(b) / 100)}` : `${k}: ${String(a)} → ${String(b)}`))
        .join("; ");
    }
    return Object.entries(m)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join("; ");
  } catch {
    return meta.slice(0, 200);
  }
}

export default async function AuditPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const session = await requireAdmin(locale, "admin");
  const sp = await searchParams;
  const entity = one(sp.entity);
  const q = one(sp.q);
  const page = Number.parseInt(one(sp.page), 10) || 1;
  const data = await listAudit({ entity: entity in ENTITIES ? entity : undefined, q, page });
  const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Tashkent" }).format(d);
  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ entity, q, ...over })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/${locale}/admin/audit${s ? `?${s}` : ""}`;
  };
  const pill = (on: boolean) => `inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ${on ? "bg-petrol-900 text-cream ring-petrol-900" : "bg-paper ring-line hover:bg-paper-2"}`;

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="audit">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">Журнал действий</h1>
          <p className="mt-1 text-sm text-muted">Записей: {data.total}. Личные данные клиентов сюда не пишутся.</p>
        </div>
        <form action={`/${locale}/admin/audit`} method="get" role="search" className="flex gap-2">
          {entity && <input type="hidden" name="entity" value={entity} />}
          <label htmlFor="au-q" className="sr-only">
            Кто, действие или объект
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input id="au-q" name="q" defaultValue={q} placeholder="Кто, действие, номер, артикул" className="field w-72 pl-10" />
          </div>
          <button type="submit" className="h-12 rounded-full bg-petrol-900 px-5 text-sm font-medium text-cream">
            Найти
          </button>
        </form>
      </div>

      <nav aria-label="Тип объекта" className="mt-6 flex flex-wrap gap-2">
        <Link href={href({ entity: undefined, page: undefined })} aria-current={!entity ? "page" : undefined} className={pill(!entity)}>
          Все
        </Link>
        {Object.entries(ENTITIES).map(([k, v]) => (
          <Link key={k} href={href({ entity: k, page: undefined })} aria-current={entity === k ? "page" : undefined} className={pill(entity === k)}>
            {v}
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-[22px] bg-paper ring-1 ring-line">
        {data.rows.length === 0 ? (
          <p className="p-10 text-center text-ink-2">Записей нет.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs tracking-wider text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Когда</th>
                <th className="px-4 py-3 font-medium">Кто</th>
                <th className="px-4 py-3 font-medium">Действие</th>
                <th className="px-4 py-3 font-medium">Объект</th>
                <th className="px-4 py-3 font-medium">Подробности</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3 text-ink">{r.actor}</td>
                  <td className="px-4 py-3 text-ink">{ACTIONS[r.action] ?? r.action}</td>
                  <td className="mono-num px-4 py-3 text-ink-2">{r.entityId ?? "—"}</td>
                  <td className="max-w-[420px] px-4 py-3 text-xs break-words text-muted">{describe(r.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.pageCount > 1 && (
        <nav aria-label="Страницы" className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(data.pageCount, 20) }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: n > 1 ? n : undefined })}
              aria-current={n === data.page ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-full ${n === data.page ? "bg-petrol-900 text-cream" : "bg-paper ring-1 ring-line"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </AdminShell>
  );
}
