import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { listUserOrders, listVehicles } from "@/features/account/service";
import { OrderRows } from "@/components/account/OrderRows";
import { ArrowRight } from "@/components/ui/icons";

export default async function AccountOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account`);
  const t = getDictionary(locale);
  const a = t.account;
  const [orders, cars] = await Promise.all([listUserOrders(user.id, 3), listVehicles(user.id)]);
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";
  const h2 = "text-2xl font-medium tracking-[-0.03em] text-petrol-900";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={h2}>{a.overview.recentOrders}</h2>
          {orders.length > 0 && (
            <Link href={`/${locale}/account/orders`} className="link-draw text-sm font-medium text-petrol-700">
              {a.overview.allOrders}
            </Link>
          )}
        </div>
        {orders.length ? (
          <OrderRows locale={locale} orders={orders} t={t} />
        ) : (
          <div className="mt-6">
            <p className="text-ink-2">{a.overview.noOrders}</p>
            <Link href={`/${locale}/catalog`} className="pill-cta on-light mt-6">
              <span className="pill-label">{a.overview.toCatalog}</span>
              <span className="pill-circle" aria-hidden="true">
                <ArrowRight className="size-5" />
              </span>
            </Link>
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className={h2}>{a.overview.myCars}</h2>
        {cars.length ? (
          <ul className="mt-5 grid gap-2">
            {cars.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${locale}/catalog?${new URLSearchParams({ make: c.make, model: c.model, year: String(c.year) })}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-line transition-colors hover:bg-paper-2"
                >
                  <span className="font-medium text-ink">
                    {c.make === "kia" ? "Kia" : "Hyundai"} {c.model} <span className="mono-num text-ink-2">{c.year}</span>
                  </span>
                  <ArrowRight className="size-4 text-petrol-700" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-2">{a.overview.noCars}</p>
        )}
        <Link href={`/${locale}/account/vehicles`} className="btn btn-primary mt-6">
          {a.overview.addCar}
        </Link>
      </div>
    </div>
  );
}
