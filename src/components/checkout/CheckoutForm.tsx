"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Quote } from "@/features/cart/quote";
import { readCart, writeCart } from "@/features/cart/client";
import { DELIVERY_METHODS, PAYMENT_METHODS, REGIONS } from "@/config/shop";
import { formatUZS } from "@/lib/format";
import { ArrowRight } from "@/components/ui/icons";

type T = { checkout: Dictionary["checkout"]; cart: Dictionary["cart"] };
type Field = "name" | "phone" | "email" | "region" | "city" | "address" | "note" | "consent" | "form";

const IDEM_KEY = "gremu-checkout-key";

export type CheckoutPrefill = { name: string; phone: string; email: string; region: string; city: string; address: string };

export function CheckoutForm({
  locale,
  t,
  prefill,
  paymentMethods,
}: {
  locale: Locale;
  t: T;
  prefill?: CheckoutPrefill;
  /** Codes the server says are available now (online methods only when their provider is configured). */
  paymentMethods: string[];
}) {
  const methods = PAYMENT_METHODS.filter((p) => paymentMethods.includes(p.code));
  const c = t.checkout;
  const id = useId();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [changed, setChanged] = useState(false);
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState<string>(DELIVERY_METHODS[0].code);

  useEffect(() => {
    const items = readCart();
    if (!items.length) {
      setQuote({ lines: [], missing: [], subtotalMinor: 0, currency: "UZS", computedAt: "" });
      return;
    }
    fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, items }) })
      .then((r) => r.json())
      .then((d) => (d.ok ? setQuote(d.quote) : setLoadError(true)))
      .catch(() => setLoadError(true));
  }, [locale]);

  const sellable = quote?.lines.filter((l) => l.purchasable && l.qty > 0) ?? [];
  const method = DELIVERY_METHODS.find((d) => d.code === delivery)!;

  // One idempotency key per checkout attempt, kept across retries of the same submit.
  const idemKey = () => {
    let k = sessionStorage.getItem(IDEM_KEY);
    if (!k) {
      k = crypto.randomUUID();
      sessionStorage.setItem(IDEM_KEY, k);
    }
    return k;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending || !quote) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const payload = {
      locale,
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      region: get("region"),
      city: get("city"),
      address: get("address"),
      deliveryMethod: get("deliveryMethod"),
      paymentMethod: get("paymentMethod"),
      note: get("note"),
      consent: fd.get("consent") === "on",
      items: sellable.map((l) => ({ id: l.id, qty: l.qty })),
      expectedTotalMinor: quote.subtotalMinor,
    };

    const next: Partial<Record<Field, string>> = {};
    if (payload.name.length < 2) next.name = c.errors.name;
    if (!/^\+?[0-9\s\-()]{7,24}$/.test(payload.phone)) next.phone = c.errors.phone;
    if (!payload.region) next.region = c.errors.region;
    if (payload.city.length < 2) next.city = c.errors.city;
    if (method.needsAddress && !payload.address) next.address = c.errors.address;
    if (!payload.consent) next.consent = c.errors.consent;
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }

    setSending(true);
    setChanged(false);
    try {
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        sessionStorage.removeItem(IDEM_KEY);
        writeCart([]);
        router.push(`/${locale}/order/${data.orderNumber}?t=${data.token}`);
        return;
      }
      if (res.status === 409 && data.quote) {
        sessionStorage.removeItem(IDEM_KEY); // the order content changed — a new attempt
        setQuote(data.quote);
        setChanged(true);
        // keep the browser cart in step with what is actually available
        writeCart((data.quote as Quote).lines.filter((l) => l.purchasable && l.qty > 0).map((l) => ({ id: l.id, qty: l.qty })));
      } else if (res.status === 422 && data.fields) {
        const mapped: Partial<Record<Field, string>> = {};
        for (const [k, code] of Object.entries(data.fields as Record<string, string>)) {
          const key = (k in c.errors ? k : "form") as Field;
          mapped[key] = (c.errors as Record<string, string>)[String(code)] ?? c.errors.server;
        }
        setErrors(mapped);
      } else if (res.status === 422 && data.error === "empty") {
        setErrors({ form: c.empty });
      } else {
        setErrors({ form: res.status === 429 ? c.errors.rate_limited : c.errors.server });
      }
    } catch {
      setErrors({ form: c.errors.network });
    }
    setSending(false);
  };

  if (loadError) {
    return <p role="alert" className="rounded-[22px] bg-bad/10 p-6 text-bad ring-1 ring-bad/25">{t.cart.error}</p>;
  }
  if (!quote) {
    return <div aria-busy="true" className="h-96 animate-pulse rounded-[26px] bg-paper ring-1 ring-line" />;
  }
  if (!sellable.length) {
    return (
      <div className="flex flex-col items-center rounded-[26px] bg-paper px-6 py-16 text-center ring-1 ring-line">
        <p className="text-2xl font-medium text-petrol-900">{c.empty}</p>
        <Link href={`/${locale}/catalog`} className="pill-cta on-light mt-8">
          <span className="pill-label">{c.toCatalog}</span>
          <span className="pill-circle" aria-hidden="true">
            <ArrowRight className="size-5" />
          </span>
        </Link>
      </div>
    );
  }

  const label = "mb-1.5 block text-sm font-medium text-ink";
  const aria = (k: Field) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });
  const err = (k: Field) =>
    errors[k] ? (
      <p id={`${id}-${k}-err`} className="mt-1.5 text-sm text-bad">
        {errors[k]}
      </p>
    ) : null;
  const card = "rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8";
  const h2 = "text-2xl font-medium tracking-[-0.03em] text-petrol-900";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:gap-10">
      <div className="grid gap-6">
        <fieldset className={card}>
          <legend className={`${h2} float-left mb-6 w-full`}>{c.contacts}</legend>
          <div className="clear-both grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-name`} className={label}>{c.name}</label>
              <input id={`${id}-name`} name="name" autoComplete="name" defaultValue={prefill?.name} className="field" {...aria("name")} />
              {err("name")}
            </div>
            <div>
              <label htmlFor={`${id}-phone`} className={label}>{c.phone}</label>
              <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" defaultValue={prefill?.phone} className="field" {...aria("phone")} />
              {err("phone")}
            </div>
            <div>
              <label htmlFor={`${id}-email`} className={label}>{c.email}</label>
              <input id={`${id}-email`} name="email" type="email" autoComplete="email" defaultValue={prefill?.email} className="field" {...aria("email")} />
              {err("email")}
            </div>
          </div>
        </fieldset>

        <fieldset className={card}>
          <legend className={`${h2} float-left mb-6 w-full`}>{c.deliveryTitle}</legend>
          <div className="clear-both grid gap-3">
            {DELIVERY_METHODS.map((d) => (
              <label key={d.code} className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-petrol-700">
                <input type="radio" name="deliveryMethod" value={d.code} checked={delivery === d.code} onChange={() => setDelivery(d.code)} className="mt-1 size-4 accent-[var(--petrol-700)]" />
                <span>
                  <span className="block font-medium text-ink">{d.label[locale]}</span>
                  <span className="mt-1 block text-sm text-ink-2">{d.hint[locale]}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-region`} className={label}>{c.region}</label>
              <select id={`${id}-region`} name="region" defaultValue={prefill?.region ?? ""} className="field" {...aria("region")}>
                <option value="" disabled>{c.regionPlaceholder}</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>{r[locale]}</option>
                ))}
              </select>
              {err("region")}
            </div>
            <div>
              <label htmlFor={`${id}-city`} className={label}>{c.city}</label>
              <input id={`${id}-city`} name="city" autoComplete="address-level2" defaultValue={prefill?.city} className="field" {...aria("city")} />
              {err("city")}
            </div>
            {method.needsAddress && (
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-address`} className={label}>{c.address}</label>
                <input id={`${id}-address`} name="address" autoComplete="street-address" defaultValue={prefill?.address} placeholder={c.addressHint} className="field" {...aria("address")} />
                {err("address")}
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className={card}>
          <legend className={`${h2} float-left mb-6 w-full`}>{c.paymentTitle}</legend>
          <div className="clear-both grid gap-3">
            {methods.map((p, i) => (
              <label key={p.code} className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-petrol-700">
                <input type="radio" name="paymentMethod" value={p.code} defaultChecked={i === 0} className="mt-1 size-4 accent-[var(--petrol-700)]" />
                <span>
                  <span className="block font-medium text-ink">{p.label[locale]}</span>
                  <span className="mt-1 block text-sm text-ink-2">{p.hint[locale]}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6">
            <label htmlFor={`${id}-note`} className={label}>{c.note}</label>
            <textarea id={`${id}-note`} name="note" rows={3} maxLength={1000} placeholder={c.noteHint} className="field min-h-24 py-3" {...aria("note")} />
            {err("note")}
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className={card}>
          <h2 className={h2}>{c.summary}</h2>
          {changed && (
            <p role="alert" className="mt-4 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
              {c.changed}
            </p>
          )}
          <ul className="mt-5 grid gap-3 border-b border-line pb-5">
            {sellable.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink">{l.title}</span>
                  <span className="mono-num text-xs text-muted">
                    {l.sku} · {l.qty} × {formatUZS(l.unitPriceMinor, locale)}
                  </span>
                </span>
                <span className="shrink-0 font-medium whitespace-nowrap text-ink">{formatUZS(l.lineTotalMinor, locale)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{c.subtotal}</dt>
              <dd className="text-ink">{formatUZS(quote.subtotalMinor, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{c.delivery}</dt>
              <dd className="text-right text-muted">{method.feeMinor == null ? c.deliveryAgreed : formatUZS(method.feeMinor, locale)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-5">
            <span className="text-ink-2">{c.total}</span>
            <span className="text-[1.9rem] leading-none font-medium tracking-[-0.04em] text-petrol-900">{formatUZS(quote.subtotalMinor + (method.feeMinor ?? 0), locale)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">{c.totalNote}</p>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-[var(--petrol-700)]" {...aria("consent")} />
            {c.consent}
          </label>
          {err("consent")}

          {errors.form && (
            <p role="alert" className="mt-4 rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
              {errors.form}
            </p>
          )}

          <button type="submit" disabled={sending} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-petrol-900 font-medium text-cream transition-colors hover:bg-petrol-700 disabled:opacity-60">
            {sending ? c.sending : c.submit}
            {!sending && <ArrowRight className="size-4" />}
          </button>
          <Link href={`/${locale}/cart`} className="mt-3 flex min-h-11 items-center justify-center text-sm text-ink-2">
            <span className="link-draw">{c.back}</span>
          </Link>
        </div>
      </aside>
    </form>
  );
}
