import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { listUserOrders } from "@/features/account/service";
import { OrderRows } from "@/components/account/OrderRows";

export default async function AccountOrders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/orders`);
  const t = getDictionary(locale);
  const orders = await listUserOrders(user.id);
  return (
    <div className="rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8">
      <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{t.account.orders.title}</h2>
      {orders.length ? (
        <OrderRows locale={locale} orders={orders} t={t} />
      ) : (
        <p className="mt-4 max-w-[60ch] text-ink-2">{t.account.orders.empty}</p>
      )}
    </div>
  );
}
