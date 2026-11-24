import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { logoutAction } from "@/app/[locale]/admin/actions";

export const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "В работе",
  ready: "Готов к выдаче",
  shipped: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Не оплачен",
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  failed: "Ошибка оплаты",
  cancelled: "Оплата отменена",
  refunded: "Возвращён",
};

const STATUS_TONE: Record<string, string> = {
  new: "bg-petrol-400/15 text-petrol-700 ring-petrol-400/40",
  confirmed: "bg-glow/20 text-petrol-800 ring-glow/50",
  processing: "bg-warn/12 text-[oklch(45%_0.12_70)] ring-warn/35",
  ready: "bg-ok/12 text-ok ring-ok/30",
  shipped: "bg-ok/12 text-ok ring-ok/30",
  completed: "bg-ink/8 text-ink-2 ring-line",
  cancelled: "bg-bad/10 text-bad ring-bad/25",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${STATUS_TONE[status] ?? "ring-line"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function AdminShell({
  locale,
  user,
  children,
  active = "orders",
  role = "admin",
}: {
  locale: string;
  user: string;
  children: ReactNode;
  active?: "orders" | "inquiries" | "products" | "catalog" | "audit";
  role?: "admin" | "staff";
}) {
  const tab = (on: boolean) => `inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap ${on ? "bg-white/15 text-cream" : "text-cream/70 hover:bg-white/8 hover:text-cream"}`;
  return (
    <div className="min-h-svh bg-paper-2">
      <header className="bg-brand text-cream">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href={`/${locale}/admin`} aria-label="Админка gremu" className="rounded-md">
              <Wordmark />
            </Link>
            <nav aria-label="Админка" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
              <Link href={`/${locale}/admin`} aria-current={active === "orders" ? "page" : undefined} className={tab(active === "orders")}>
                Заказы
              </Link>
              <Link href={`/${locale}/admin/inquiries`} aria-current={active === "inquiries" ? "page" : undefined} className={tab(active === "inquiries")}>
                Обращения
              </Link>
              <Link href={`/${locale}/admin/products`} aria-current={active === "products" ? "page" : undefined} className={tab(active === "products")}>
                Товары
              </Link>
              {role === "admin" && (
                <>
                  <Link href={`/${locale}/admin/catalog`} aria-current={active === "catalog" ? "page" : undefined} className={tab(active === "catalog")}>
                    Каталог
                  </Link>
                  <Link href={`/${locale}/admin/audit`} aria-current={active === "audit" ? "page" : undefined} className={tab(active === "audit")}>
                    Журнал
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden whitespace-nowrap text-cream/70 xl:inline">
              {user} · {role === "admin" ? "админ" : "сотрудник"}
            </span>
            <Link href={`/${locale}`} className="hidden h-10 items-center rounded-full px-4 whitespace-nowrap text-cream/80 ring-1 ring-cream/20 hover:bg-white/8 sm:inline-flex">
              На сайт
            </Link>
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="inline-flex h-10 items-center rounded-full bg-cream px-4 font-medium text-petrol-900">
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="wrap py-8 md:py-10">{children}</div>
    </div>
  );
}
