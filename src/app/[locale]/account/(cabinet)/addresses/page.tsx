import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { listAddresses, MAX_ADDRESSES } from "@/features/account/service";
import { AddressForm } from "@/components/account/AccountForms";
import { REGIONS } from "@/config/shop";
import { defaultAddressAction, removeAddressAction } from "../../actions";

export default async function AccountAddresses({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/addresses`);
  const t = getDictionary(locale).account.addresses;
  const list = await listAddresses(user.id);
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <div className="grid gap-6">
      <div className={card}>
        <h2 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">{t.title}</h2>
        {list.length ? (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {list.map((a) => (
              <li key={a.id} className={`flex flex-col justify-between gap-4 rounded-2xl p-5 ring-1 ${a.isDefault ? "ring-2 ring-petrol-700" : "ring-line"}`}>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {a.label || a.recipientName}
                    {a.isDefault && (
                      <span className="rounded-full bg-petrol-700 px-2.5 py-0.5 text-xs font-medium text-cream">{t.isDefault}</span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    {[REGIONS.find((r) => r.code === a.region)?.[locale], a.city, a.addressLine, a.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {a.recipientName} · <span className="mono-num">{a.phone}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!a.isDefault && (
                    <form action={defaultAddressAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-petrol-700 hover:underline">
                        {t.makeDefault}
                      </button>
                    </form>
                  )}
                  <form action={removeAddressAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="inline-flex min-h-11 items-center px-2 text-sm text-bad hover:underline">
                      {t.remove}
                      <span className="sr-only">: {a.label || a.addressLine}</span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-ink-2">{t.empty}</p>
        )}
      </div>

      {list.length < MAX_ADDRESSES ? (
        <div className={card}>
          <h2 className="mb-6 text-xl font-medium tracking-[-0.02em] text-petrol-900">{t.add}</h2>
          <AddressForm locale={locale} t={t} defaults={{ name: user.fullName ?? "", phone: user.phone ?? "" }} />
        </div>
      ) : (
        <p className="text-sm text-ink-2">{t.limit}</p>
      )}
    </div>
  );
}
