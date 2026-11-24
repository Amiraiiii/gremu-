import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/user";
import { AccountNav } from "@/components/account/AccountNav";

// Personal data: render per request, never cache or index.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CabinetLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireUser(locale, `/${locale}/account`);
  const t = getDictionary(locale).account;
  const base = `/${locale}/account`;
  const nav = [
    { href: base, label: t.nav.overview },
    { href: `${base}/orders`, label: t.nav.orders },
    { href: `${base}/vehicles`, label: t.nav.vehicles },
    { href: `${base}/addresses`, label: t.nav.addresses },
    { href: `${base}/profile`, label: t.nav.profile },
    { href: `${base}/payments`, label: t.nav.payments },
  ];

  return (
    <>
      <section className="bg-brand relative overflow-hidden pt-32 pb-8 text-cream md:pt-40 md:pb-10">
        <svg aria-hidden="true" viewBox="0 0 1440 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-cream/12" fill="none">
          <path d="M-40 380 C 380 60, 1000 0, 1500 200" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="6 10" />
        </svg>
        <div className="wrap relative">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm text-cream/60">{t.title}</p>
              <h1 className="display-lg mt-3 max-w-[18ch] break-words">
                {t.hello}
                {user.fullName ? <span className="text-grad-on-dark">, {user.fullName.split(" ")[0]}</span> : null}
              </h1>
              {user.email && <p className="mt-3 truncate text-cream/65">{user.email}</p>}
            </div>
            <form method="post" action="/api/auth/logout">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-ghost text-cream">
                {t.logout}
              </button>
            </form>
          </div>
          <div className="mt-8">
            <AccountNav items={nav} label={t.title} />
          </div>
        </div>
      </section>
      <section className="bg-paper-2 py-10 md:py-14">
        <div className="wrap">{children}</div>
      </section>
    </>
  );
}
