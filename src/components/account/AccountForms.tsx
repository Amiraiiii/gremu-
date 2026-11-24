"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { DEMO_MODELS, YEARS, type Make } from "@/components/home/vehicle-data";
import { REGIONS } from "@/config/shop";
import { addAddressAction, addVehicleAction, saveProfileAction, type FormState } from "@/app/[locale]/account/actions";

type A = Dictionary["account"];
const label = "mb-1.5 block text-sm font-medium text-ink";
const initial: FormState = {};

function Status({ state, okText, errorText }: { state: FormState; okText?: string; errorText?: string }) {
  if (state.ok && okText) return <p role="status" className="text-sm font-medium text-ok">{okText}</p>;
  if (state.error && errorText) return <p role="alert" className="text-sm text-bad">{errorText}</p>;
  return <span role="status" />;
}

/** Profile, notification and privacy settings. Email is read-only: it belongs to the Google account. */
export function ProfileForm({
  locale,
  t,
  user,
}: {
  locale: Locale;
  t: A["profile"];
  user: { fullName: string; email: string; phone: string; preferredLocale: string; notifyOrderEmail: boolean; marketingOptIn: boolean };
}) {
  const id = useId();
  const [state, action, pending] = useActionState(saveProfileAction, initial);
  const f = state.fields ?? {};
  return (
    <form noValidate className="grid gap-5" onSubmit={(e) => {
        // No React 19 auto-reset: typed values survive a validation error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}>
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className={label}>{t.name}</label>
          <input id={`${id}-name`} name="fullName" autoComplete="name" defaultValue={user.fullName} maxLength={80} className="field"
            aria-invalid={Boolean(f.fullName)} aria-describedby={f.fullName ? `${id}-name-err` : undefined} />
          {f.fullName && <p id={`${id}-name-err`} className="mt-1.5 text-sm text-bad">{t.errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>{t.email}</label>
          <input id={`${id}-email`} value={user.email} readOnly aria-describedby={`${id}-email-note`} className="field bg-paper-2 text-ink-2" />
          <p id={`${id}-email-note`} className="mt-1.5 text-xs text-muted">{t.emailNote}</p>
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className={label}>{t.phone}</label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" defaultValue={user.phone} className="field"
            aria-invalid={Boolean(f.phone)} aria-describedby={f.phone ? `${id}-phone-err` : undefined} />
          {f.phone && <p id={`${id}-phone-err`} className="mt-1.5 text-sm text-bad">{t.errors.phone}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-lang`} className={label}>{t.language}</label>
          <select id={`${id}-lang`} name="preferredLocale" defaultValue={user.preferredLocale} className="field">
            <option value="ru">Русский</option>
            <option value="uz">Oʻzbekcha</option>
          </select>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">{t.notifications}</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="notifyOrderEmail" defaultChecked={user.notifyOrderEmail} className="size-4 accent-[var(--petrol-700)]" />
          <span className="text-ink-2">{t.notifyOrders}</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="size-4 accent-[var(--petrol-700)]" />
          <span className="text-ink-2">{t.marketing}</span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">{t.save}</button>
        <Status state={state} okText={t.saved} errorText={t.errors.invalid} />
      </div>
    </form>
  );
}

/** Make → model → year → optional generation/engine/trim. Models come from the same list as the home selector. */
export function VehicleForm({ locale, t }: { locale: Locale; t: A["vehicles"] }) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addVehicleAction, initial);
  const [make, setMake] = useState<Make | "">("");
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setMake("");
    }
  }, [state]);
  const opt = <span className="font-normal text-muted"> ({t.optional})</span>;
  return (
    <form ref={ref} className="grid gap-5" onSubmit={(e) => {
        // No React 19 auto-reset: typed values survive a validation error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}>
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-make`} className={label}>{t.make}</label>
          <select id={`${id}-make`} name="make" required value={make} onChange={(e) => setMake(e.target.value as Make)} className="field">
            <option value="" disabled>{t.choose}</option>
            <option value="hyundai">Hyundai</option>
            <option value="kia">Kia</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-model`} className={label}>{t.model}</label>
          <select key={make} id={`${id}-model`} name="model" required defaultValue="" disabled={!make} className="field">
            <option value="" disabled>{t.choose}</option>
            {make && DEMO_MODELS[make].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-year`} className={label}>{t.year}</label>
          <select id={`${id}-year`} name="year" required defaultValue="" className="field">
            <option value="" disabled>{t.choose}</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-gen`} className={label}>{t.generation}{opt}</label>
          <input id={`${id}-gen`} name="generation" maxLength={40} className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-engine`} className={label}>{t.engine}{opt}</label>
          <input id={`${id}-engine`} name="engine" maxLength={40} placeholder="1.6 MPI" className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-trim`} className={label}>{t.trim}{opt}</label>
          <input id={`${id}-trim`} name="trim" maxLength={40} className="field" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">{t.add}</button>
        <Status state={state} errorText={state.error === "limit" ? t.limit : t.errors.invalid} />
      </div>
    </form>
  );
}

export function AddressForm({ locale, t, defaults }: { locale: Locale; t: A["addresses"]; defaults: { name: string; phone: string } }) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addAddressAction, initial);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const f = state.fields ?? {};
  const inv = (k: string) => ({ "aria-invalid": Boolean(f[k]) });
  return (
    <form ref={ref} noValidate className="grid gap-5" onSubmit={(e) => {
        // No React 19 auto-reset: typed values survive a validation error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}>
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-label`} className={label}>{t.label}</label>
          <input id={`${id}-label`} name="label" maxLength={40} placeholder={t.labelHint} className="field" />
        </div>
        <div>
          <label htmlFor={`${id}-recipient`} className={label}>{t.recipient}</label>
          <input id={`${id}-recipient`} name="recipientName" autoComplete="name" defaultValue={defaults.name} className="field" {...inv("recipientName")} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className={label}>{t.phone}</label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" defaultValue={defaults.phone} className="field" {...inv("phone")} />
        </div>
        <div>
          <label htmlFor={`${id}-region`} className={label}>{t.region}</label>
          <select id={`${id}-region`} name="region" defaultValue="" className="field" {...inv("region")}>
            <option value="" disabled>—</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r[locale]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-city`} className={label}>{t.city}</label>
          <input id={`${id}-city`} name="city" autoComplete="address-level2" className="field" {...inv("city")} />
        </div>
        <div>
          <label htmlFor={`${id}-postal`} className={label}>{t.postal}</label>
          <input id={`${id}-postal`} name="postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={12} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-line`} className={label}>{t.address}</label>
          <input id={`${id}-line`} name="addressLine" autoComplete="street-address" className="field" {...inv("addressLine")} />
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="isDefault" className="size-4 accent-[var(--petrol-700)]" />
        <span className="text-ink-2">{t.makeDefault}</span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">{t.add}</button>
        <Status state={state} errorText={state.error === "limit" ? t.limit : t.errors.invalid} />
      </div>
    </form>
  );
}
