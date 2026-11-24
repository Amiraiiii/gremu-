"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CartIcon, GlobeIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { gsap, MQ } from "@/lib/gsap";
import { CART_EVENT, cartCount } from "@/features/cart/client";
import { locales, switchLocalePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type Props = {
  locale: Locale;
  t: Dictionary["nav"];
  categories: Dictionary["categories"]["items"];
};

export function Header({ locale, t, categories }: Props) {
  const pathname = usePathname() || `/${locale}`;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const menuButton = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = "hidden"; // Lenis autoToggle stops while the root is hidden
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const el = overlay.current;
    el?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    let ctx: gsap.Context | undefined;
    if (el && matchMedia(MQ.motion).matches) {
      ctx = gsap.context(() => {
        gsap.from("[data-menu-big]", { yPercent: 110, duration: 0.8, stagger: 0.05, ease: "power4.out" });
        gsap.from("[data-menu-small]", { y: 12, opacity: 0, duration: 0.5, stagger: 0.03, delay: 0.25, ease: "power2.out" });
      }, el);
    }
    return () => {
      root.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      ctx?.revert();
    };
  }, [open]);

  const nav = [
    { href: `/${locale}/catalog`, label: t.catalog },
    { href: `/${locale}/catalog?make=hyundai`, label: t.hyundai },
    { href: `/${locale}/catalog?make=kia`, label: t.kia },
    { href: `/${locale}#how-to`, label: t.howTo },
    { href: `/${locale}/contact`, label: t.contacts },
  ];

  const pillDark =
    "glass h-12 items-center rounded-full text-cream transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-px";
  const other = locales.find((l) => l !== locale)!;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className={`wrap relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 transition-[padding] duration-500 ease-[var(--ease-out)] ${
          scrolled ? "py-3" : "py-5 md:py-7"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href={switchLocalePath(pathname, other)}
            hrefLang={other}
            aria-label={`${t.language}: ${other.toUpperCase()}`}
            className={`${pillDark} inline-flex gap-2 pr-4 pl-3 font-display text-sm font-medium whitespace-nowrap`}
          >
            <GlobeIcon />
            <span className="uppercase">{locale}</span>
            <span aria-hidden="true" className="hidden text-cream/45 sm:inline">/ {other.toUpperCase()}</span>
          </Link>
          <Link href={`/${locale}/search`} className={`${pillDark} hidden w-12 justify-center sm:inline-flex`} aria-label={t.search}>
            <SearchIcon />
          </Link>
        </div>

        <Link
          href={`/${locale}`}
          aria-label="gremu"
          className={`pointer-events-auto justify-self-center rounded-2xl px-4 py-2 transition-all duration-500 ${
            scrolled && !open ? "glass" : ""
          }`}
        >
          <Wordmark />
        </Link>

        <div className="pointer-events-auto flex items-center justify-end gap-2">
          <Link href={`/${locale}/account`} className={`${pillDark} hidden w-12 justify-center md:inline-flex`} aria-label={t.account}>
            <UserIcon />
          </Link>
          <Link href={`/${locale}/cart`} className={`${pillDark} relative inline-flex w-12 justify-center`} aria-label={count ? `${t.cart}: ${count}` : t.cart}>
            <CartIcon />
            {count > 0 && (
              <span aria-hidden="true" className="mono-num absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-glow px-1 text-[0.65rem] font-medium text-petrol-950">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-12 items-center gap-2.5 rounded-full bg-cream px-5 font-display text-sm font-semibold tracking-wide text-petrol-900 uppercase transition-transform duration-300 hover:-translate-y-px active:translate-y-px"
          >
            <span aria-hidden="true" className="relative block h-2.5 w-4">
              <span
                className={`absolute inset-x-0 top-0 h-[2px] rounded bg-current transition-transform duration-300 ${open ? "translate-y-[4px] rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-[2px] rounded bg-current transition-transform duration-300 ${open ? "-translate-y-[4px] -rotate-45" : ""}`}
              />
            </span>
            <span className="hidden sm:inline">{open ? t.close : t.menu}</span>
            <span className="sr-only sm:hidden">{open ? t.close : t.menu}</span>
          </button>
        </div>
      </div>

      {/* Full-screen menu */}
      <div
        id="site-menu"
        ref={overlay}
        hidden={!open}
        data-lenis-prevent
        className="bg-brand pointer-events-auto fixed inset-0 overflow-y-auto pt-24"
      >
        <div className="wrap grid min-h-full grid-cols-1 gap-12 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end lg:py-16">
          <nav aria-label={t.menu}>
            <ul>
              {nav.map((item) => (
                <li key={item.href} className="overflow-hidden">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    data-menu-big
                    className="group inline-flex min-h-12 items-center font-display text-[clamp(2rem,6vw,4.6rem)] leading-[1] font-extrabold tracking-[-0.03em] whitespace-nowrap text-cream uppercase"
                  >
                    <span className="transition-colors duration-300 group-hover:text-glow">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wider text-cream/55 uppercase">{t.menuCategories}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6">
              {categories.map((c) => (
                <li key={c.slug} data-menu-small>
                  <Link
                    href={`/${locale}/categories/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center text-cream/80 transition-colors hover:text-cream"
                  >
                    <span className="link-draw">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div data-menu-small className="mt-8 flex gap-2 sm:hidden">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={switchLocalePath(pathname, l)}
                  hrefLang={l}
                  aria-current={l === locale ? "true" : undefined}
                  className={`grid h-11 min-w-16 place-items-center rounded-full border border-white/20 font-display text-sm font-semibold uppercase ${
                    l === locale ? "bg-cream text-petrol-900" : "text-cream"
                  }`}
                >
                  {l}
                </Link>
              ))}
              <Link
                href={`/${locale}/account`}
                className="ml-auto inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-cream"
              >
                <UserIcon /> {t.account}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
