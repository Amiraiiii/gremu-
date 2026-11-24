import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { ProfileForm } from "@/components/account/AccountForms";
import { logoutEverywhereAction } from "../../actions";

export default async function AccountProfile({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account/profile`);
  const t = getDictionary(locale).account.profile;
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
      <div className={card}>
        <h2 className="mb-6 text-2xl font-medium tracking-[-0.03em] text-petrol-900">{t.title}</h2>
        <ProfileForm
          locale={locale}
          t={t}
          user={{
            fullName: user.fullName ?? "",
            email: user.email ?? "",
            phone: user.phone ?? "",
            preferredLocale: user.preferredLocale,
            notifyOrderEmail: user.notifyOrderEmail,
            marketingOptIn: user.marketingOptIn,
          }}
        />
      </div>
      <div className={`${card} h-max`}>
        <h2 className="text-lg font-medium text-petrol-900">{t.privacy}</h2>
        <p className="mt-3 text-sm text-ink-2">{t.privacyText}</p>
        <form action={logoutEverywhereAction} className="mt-6">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn-ghost text-petrol-800">
            {t.logoutAll}
          </button>
        </form>
      </div>
    </div>
  );
}
