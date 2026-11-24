"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Quote } from "@/features/cart/quote";
import { CART_EVENT, readCart, removeFromCart, setQty, writeCart } from "@/features/cart/client";
import { formatUZS } from "@/lib/format";
import { PartIcon } from "@/components/home/PartIcons";
import Image from "next/image";
import { ArrowRight, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { DemoBadge } from "@/components/catalog/Badges";

type T = { cart: Dictionary["cart"]; catalog: Dictionary["catalog"] };

export function CartView({ locale, t }: { locale: Locale; t: T }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Only the latest request may update the view: cancel the previous one.
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;

    const items = readCart();
    if (!items.length) {
      setQuote({ lines: [], missing: [], subtotalMinor: 0, currency: "UZS", computedAt: new Date().toISOString() });
      setStatus("ready");
      return;
    }
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, items }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (ctrl.signal.aborted) return;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "quote");
      const q = data.quote as Quote;
      if (q.missing.length) {
        writeCart(items.filter((i) => !q.missing.includes(i.id)));
        setNotice(t.cart.removedMissing);
      }
      setQuote(q);
      setStatus("ready");
    } catch {
      if (!ctrl.signal.aborted) setStatus("error");
    }
  }, [locale, t.cart.removedMissing]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CART_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      inflight.current?.abort();
      window.removeEventListener(CART_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  if (status === "loading" && !quote) {
    return (
      <div aria-busy="true" className="grid gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-[22px] bg-paper ring-1 ring-line" />
        ))}
        <span className="sr-only">{t.cart.loading}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="rounded-[22px] bg-bad/10 p-6 text-bad ring-1 ring-bad/25">
        {t.cart.error}
      </p>
    );
  }

  if (!quote?.lines.length) {
    return (
      <div className="flex flex-col items-center rounded-[26px] bg-paper px-6 py-16 text-center ring-1 ring-line">
        <p className="text-[clamp(1.8rem,3vw,2.6rem)] font-medium tracking-[-0.04em] text-petrol-900">{t.cart.empty}</p>
        <p className="mt-4 max-w-[42ch] text-ink-2">{t.cart.emptyText}</p>
        <Link href={`/${locale}/catalog`} className="pill-cta on-light mt-8">
          <span className="pill-label">{t.cart.toCatalog}</span>
          <span className="pill-circle" aria-hidden="true">
            <ArrowRight className="size-5" />
          </span>
        </Link>
      </div>
    );
  }

  const qtyBtn =
    "grid size-11 place-items-center rounded-full ring-1 ring-line transition-colors hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)] lg:gap-10">
      <div>
        {notice && (
          <p role="status" className="mb-4 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
            {notice}
          </p>
        )}
        <ul className="grid gap-3">
          {quote.lines.map((l) => {
            const max = l.stockQuantity != null && l.availability !== "on_request" ? Math.min(l.stockQuantity, 99) : 99;
            return (
              <li key={l.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-[22px] bg-paper p-3 ring-1 ring-line sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <Link
                  href={`/${locale}/products/${l.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative grid aspect-square place-items-center overflow-hidden rounded-[16px] text-cream"
                  style={{ background: l.imageUrl ? "#f3f6f7" : "linear-gradient(140deg, oklch(46% 0.07 214), oklch(24% 0.045 222))" }}
                >
                  {l.imageUrl ? (
                    <Image src={l.imageUrl} alt="" fill sizes="120px" className="object-cover" />
                  ) : (
                    <PartIcon slug={l.categorySlug} className="size-1/2" />
                  )}
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {l.isDemo && <DemoBadge label={t.catalog.demo} />}
                    <span className="mono-num text-xs text-muted">{l.sku}</span>
                  </div>
                  <Link href={`/${locale}/products/${l.slug}`} className="mt-1 block text-lg leading-snug font-medium tracking-[-0.02em] text-petrol-900">
                    <span className="link-draw">{l.title}</span>
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatUZS(l.unitPriceMinor, locale)} {t.cart.unitPrice}
                  </p>
                  {!l.purchasable && <p className="mt-1 text-sm text-bad">{t.cart.unavailable}</p>}
                  {l.adjustedFrom && <p className="mt-1 text-sm text-[oklch(45%_0.12_70)]">{t.cart.adjusted}</p>}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2" role="group" aria-label={`${t.cart.qty}: ${l.title}`}>
                    <button type="button" className={qtyBtn} aria-label={t.cart.decrease} disabled={l.qty <= 1} onClick={() => setQty(l.id, l.qty - 1)}>
                      <span aria-hidden="true" className="block h-[2px] w-3.5 rounded bg-current" />
                    </button>
                    <span className="mono-num w-8 text-center" aria-live="polite">
                      {l.qty}
                    </span>
                    <button type="button" className={qtyBtn} aria-label={t.cart.increase} disabled={l.qty >= max} onClick={() => setQty(l.id, l.qty + 1)}>
                      <PlusIcon className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-medium whitespace-nowrap text-petrol-900">{formatUZS(l.lineTotalMinor, locale)}</p>
                    <button type="button" onClick={() => removeFromCart(l.id)} aria-label={`${t.cart.remove}: ${l.title}`} className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-bad/10 hover:text-bad">
                      <CloseIcon className="size-5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-7">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{t.cart.subtotal}</dt>
              <dd className="font-medium text-ink">{formatUZS(quote.subtotalMinor, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{t.cart.delivery}</dt>
              <dd className="text-right text-muted">{t.cart.deliveryLater}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
            <span className="text-ink-2">{t.cart.total}</span>
            <span className="text-[1.9rem] leading-none font-medium tracking-[-0.04em] text-petrol-900" aria-live="polite">
              {formatUZS(quote.subtotalMinor, locale)}
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${status === "loading" ? "animate-pulse bg-warn" : "bg-ok"}`} />
            {status === "loading" ? t.cart.loading : t.cart.serverNote}
          </p>
          <Link
            href={`/${locale}/checkout`}
            aria-disabled={!quote.lines.some((l) => l.purchasable && l.qty > 0)}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-petrol-900 font-medium text-cream transition-colors hover:bg-petrol-700 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {t.cart.checkout}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
