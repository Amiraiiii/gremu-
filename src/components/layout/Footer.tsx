import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  const f = t.footer;
  const shop = [
    { href: `/${locale}/catalog`, label: t.nav.catalog },
    { href: `/${locale}/catalog?make=hyundai`, label: t.nav.hyundai },
    { href: `/${locale}/catalog?make=kia`, label: t.nav.kia },
    { href: `/${locale}#how-to`, label: t.nav.howTo },
  ];
  const info = [
    { href: `/${locale}/delivery`, label: f.delivery },
    { href: `/${locale}/payment`, label: f.payment },
    { href: `/${locale}/returns`, label: f.returns },
    { href: `/${locale}/faq`, label: f.faq },
  ];
  const linkCls = "inline-flex min-h-11 items-center text-cream/75 transition-colors hover:text-cream";

  return (
    <footer className="bg-brand relative overflow-hidden text-cream">
      <div className="wrap grid grid-cols-1 gap-12 py-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:py-20">
        <div>
          <Wordmark className="scale-125 origin-left" />
          <p className="mt-8 max-w-xs text-cream/75">{f.tagline}</p>
        </div>
        <nav aria-label={f.shop}>
          <h2 className="font-display text-sm font-semibold tracking-wider text-cream/55 uppercase">{f.shop}</h2>
          <ul className="mt-3">
            {shop.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  <span className="link-draw">{l.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={f.info}>
          <h2 className="font-display text-sm font-semibold tracking-wider text-cream/55 uppercase">{f.info}</h2>
          <ul className="mt-3">
            {info.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  <span className="link-draw">{l.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wider text-cream/55 uppercase">
            {f.contactsTitle}
          </h2>
          {/* TODO(client): phone, address, hours, Telegram/Instagram once ownership is confirmed */}
          <p className="mt-4 text-cream/60" data-assumed>
            {f.contactsPending}
          </p>
          <Link href={`/${locale}/contact`} className="btn btn-cream mt-5">
            {t.help.managerCta}
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-3 py-6 text-sm text-cream/55 md:flex-row md:items-start md:justify-between">
          <p className="max-w-2xl">{f.disclaimer}</p>
          <p className="shrink-0">© {new Date().getFullYear()} {f.rights}</p>
        </div>
      </div>
    </footer>
  );
}
