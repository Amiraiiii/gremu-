import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { SearchIcon } from "@/components/ui/icons";
import { INQUIRY_STATUSES } from "@/features/inquiries/schema";
import { listInquiries } from "@/features/inquiries/service";
import { managerEmail } from "@/lib/email";
import { inquiryStatusAction, resendInquiryAction, retryAllInquiriesAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Обращения — gremu admin", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const STATUS: Record<string, string> = { new: "Новое", in_progress: "В работе", closed: "Закрыто" };
const STATUS_TONE: Record<string, string> = {
  new: "bg-glow/25 text-petrol-900 ring-petrol-600/30",
  in_progress: "bg-warn/15 text-ink ring-warn/35",
  closed: "bg-paper-2 text-ink-2 ring-line",
};
const SOURCE: Record<string, string> = { contact_form: "Форма связи", fitment_request: "Подбор детали", ai_handoff: "AI-помощник" };
const TOPIC: Record<string, string> = { general: "Общий вопрос", fitment: "Подбор", order: "Заказ", other: "Другое" };
const EMAIL: Record<string, { label: string; tone: string }> = {
  sent: { label: "Письмо отправлено", tone: "text-ok" },
  logged: { label: "Тестовый режим: письмо не отправлялось", tone: "text-ink-2" },
  pending: { label: "Письмо в очереди", tone: "text-ink-2" },
  failed: { label: "Письмо не отправлено", tone: "text-bad" },
  not_configured: { label: "MANAGER_EMAIL не задан", tone: "text-ink-2" },
};

export default async function AdminInquiries({ params, searchParams }: Props) {
  const { locale } = await params;
  const session = await requireAdmin(locale);
  const sp = await searchParams;
  const status = one(sp.status);
  const q = one(sp.q);
  const page = Number.parseInt(one(sp.page), 10) || 1;
  const data = await listInquiries({ status, q, page });
  const all = Object.values(data.byStatus).reduce((s, n) => s + n, 0);
  const mailReady = Boolean(managerEmail());

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ status, q, ...over })) if (val) p.set(k, String(val));
    const s = p.toString();
    return `/${locale}/admin/inquiries${s ? `?${s}` : ""}`;
  };
  const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(d);
  const pill = (on: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ${on ? "bg-petrol-900 text-cream ring-petrol-900" : "bg-paper ring-line hover:bg-paper-2"}`;

  return (
    <AdminShell locale={locale} user={session.sub} role={session.role} active="inquiries">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-petrol-900">Обращения</h1>
          <p className="mt-1 text-sm text-muted">Всего: {all}</p>
        </div>
        <form action={`/${locale}/admin/inquiries`} method="get" role="search" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="inq-q" className="sr-only">
            Номер, имя, телефон, email или артикул
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input id="inq-q" name="q" defaultValue={q} placeholder="Номер, имя, телефон…" className="field w-64 pl-10" />
          </div>
          <button type="submit" className="h-12 rounded-full bg-petrol-900 px-5 text-sm font-medium text-cream">
            Найти
          </button>
        </form>
      </div>

      {!mailReady && (
        <p className="mt-6 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
          Письма менеджеру не отправляются: задайте MANAGER_EMAIL (и EMAIL_PROVIDER=resend с ключом) на сервере. Обращения всё равно сохраняются здесь.
        </p>
      )}
      {data.failedEmails > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bad/8 px-4 py-3 ring-1 ring-bad/25">
          <p className="text-sm text-bad">Не отправлено писем: {data.failedEmails}. Обращения сохранены.</p>
          <form action={retryAllInquiriesAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="h-10 rounded-full bg-paper px-4 text-sm font-medium text-petrol-900 ring-1 ring-line">
              Повторить отправку
            </button>
          </form>
        </div>
      )}

      <nav aria-label="Фильтр по статусу" className="mt-6 flex flex-wrap gap-2">
        <Link href={href({ status: undefined, page: undefined })} aria-current={!status ? "page" : undefined} className={pill(!status)}>
          Все <span className="mono-num opacity-70">{all}</span>
        </Link>
        {INQUIRY_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} aria-current={status === s ? "page" : undefined} className={pill(status === s)}>
            {STATUS[s]} <span className="mono-num opacity-70">{data.byStatus[s] ?? 0}</span>
          </Link>
        ))}
      </nav>

      {data.rows.length === 0 ? (
        <p className="mt-6 rounded-[22px] bg-paper p-10 text-center text-ink-2 ring-1 ring-line">
          {q || status ? "Ничего не найдено по этому фильтру." : "Обращений пока нет."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {data.rows.map((r) => {
            const mail = EMAIL[r.emailStatus] ?? { label: r.emailStatus, tone: "text-ink-2" };
            return (
              <li key={r.id} className="rounded-[22px] bg-paper p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="mono-num font-medium text-petrol-800">{r.id}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_TONE[r.status] ?? "ring-line"}`}>{STATUS[r.status] ?? r.status}</span>
                      <span className="text-xs text-muted">
                        {SOURCE[r.source] ?? r.source} · {TOPIC[r.topic] ?? r.topic} · {r.locale.toUpperCase()} · {fmt(r.createdAt)}
                      </span>
                    </p>
                    <p className="mt-2 font-medium text-ink">
                      {r.name}
                      {r.phone && <span className="mono-num ml-2 font-normal text-ink-2">{r.phone}</span>}
                      {r.email && <span className="ml-2 font-normal text-ink-2">{r.email}</span>}
                    </p>
                    {(r.vehicle || r.sku) && (
                      <p className="mt-1 text-sm text-ink-2">
                        {r.vehicle}
                        {r.vehicle && r.sku ? " · " : ""}
                        {r.sku && <span className="mono-num">арт. {r.sku}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INQUIRY_STATUSES.filter((s) => s !== r.status).map((s) => (
                      <form key={s} action={inquiryStatusAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="to" value={s} />
                        <button type="submit" className="h-9 rounded-full px-3.5 text-xs font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2">
                          {s === "new" ? "Вернуть в новые" : s === "in_progress" ? "Взять в работу" : "Закрыть"}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm text-petrol-700 select-none">Сообщение</summary>
                  <p className="mt-2 max-w-[80ch] text-sm whitespace-pre-wrap text-ink">{r.message}</p>
                </details>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
                  <span className={mail.tone}>
                    {mail.label}
                    {r.emailAttempts > 1 ? ` · попыток: ${r.emailAttempts}` : ""}
                  </span>
                  {r.emailError && <span className="text-muted">({r.emailError})</span>}
                  {mailReady && r.emailStatus !== "sent" && (
                    <form action={resendInquiryAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="font-medium text-petrol-700 underline-offset-4 hover:underline">
                        Отправить письмо ещё раз
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
