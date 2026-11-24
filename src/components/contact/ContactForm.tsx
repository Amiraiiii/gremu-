"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { ArrowRight } from "@/components/ui/icons";
import { DEMO_MODELS, YEARS, type Make } from "@/components/home/vehicle-data";

type T = Dictionary["contact"];
type Topic = keyof T["topics"];
type Errors = Partial<Record<"name" | "phone" | "email" | "message" | "consent" | "vin" | "year" | "form", string>>;

export function ContactForm({ locale, t, initialTopic, initialSku }: { locale: Locale; t: T; initialTopic?: Topic; initialSku?: string }) {
  const id = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [result, setResult] = useState<{ id: string; notified: boolean } | null>(null);
  const idem = useRef<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const [topic, setTopic] = useState<Topic>(initialTopic ?? "general");
  const [make, setMake] = useState<Make | "">("");

  const err = (code: string): string => (t.errors as Record<string, string>)[code] ?? t.errors.server;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "sending") return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      topic: String(fd.get("topic") ?? "general"),
      message: String(fd.get("message") ?? ""),
      sku: String(fd.get("sku") ?? ""),
      make: String(fd.get("make") ?? ""),
      model: String(fd.get("model") ?? ""),
      year: String(fd.get("year") ?? ""),
      engine: String(fd.get("engine") ?? ""),
      vin: String(fd.get("vin") ?? "").trim().toUpperCase(),
      consent: fd.get("consent") === "on",
      website: String(fd.get("website") ?? ""),
      locale,
    };

    // Quick client checks; the server validates again.
    const next: Errors = {};
    if (payload.name.trim().length < 2) next.name = t.errors.name;
    if (!payload.phone.trim() && !payload.email.trim()) next.phone = t.errors.contact;
    if (payload.message.trim().length < 5) next.message = t.errors.message;
    if (!payload.consent) next.consent = t.errors.consent;
    if (payload.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(payload.vin)) next.vin = t.errors.vin;
    setErrors(next);
    if (Object.keys(next).length) {
      // Wait for React to render the error state, then move focus to the first invalid field.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }

    if (!idem.current) idem.current = crypto.randomUUID();
    setState("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem.current },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setResult({ id: data.id, notified: Boolean(data.notified) });
        setState("done");
        return;
      }
      if (res.status === 422 && data.fields) {
        const mapped: Errors = {};
        for (const [k, code] of Object.entries(data.fields as Record<string, string>)) {
          const field = (["name", "phone", "email", "message", "consent", "vin", "year"].includes(k) ? k : "form") as keyof Errors;
          mapped[field] = err(String(code));
        }
        setErrors(mapped);
      } else {
        setErrors({ form: res.status === 429 ? t.errors.rate_limited : t.errors.server });
      }
    } catch {
      setErrors({ form: t.errors.network });
    }
    setState("idle");
  };

  if (state === "done" && result) {
    return (
      <div role="status" className="rounded-[26px] bg-paper p-8 ring-1 ring-line md:p-10">
        <span className="grid size-14 place-items-center rounded-full bg-ok/15 text-ok">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="mt-6 text-3xl font-medium tracking-[-0.03em] text-petrol-900">{t.successTitle}</h2>
        <p className="mt-3 text-ink-2">
          {t.successText} <span className="mono-num text-ink">{result.id}</span>
        </p>
        {!result.notified && <p className="mt-3 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">{t.successMock}</p>}
        <button
          type="button"
          onClick={() => {
            idem.current = "";
            setResult(null);
            setState("idle");
          }}
          className="mt-8 inline-flex h-12 items-center rounded-full px-6 text-petrol-900 ring-1 ring-line hover:bg-paper-2"
        >
          {t.again}
        </button>
      </div>
    );
  }

  const label = "mb-1.5 block text-sm font-medium text-ink";
  const fieldErr = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${id}-${k}-err`} className="mt-1.5 text-sm text-bad">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: keyof Errors) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5 rounded-[26px] bg-paper p-6 ring-1 ring-line md:p-8">
      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor={`${id}-name`} className={label}>
          {t.name}
        </label>
        <input id={`${id}-name`} name="name" autoComplete="name" className="field" {...aria("name")} />
        {fieldErr("name")}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-phone`} className={label}>
            {t.phone}
          </label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" className="field" {...aria("phone")} />
          {fieldErr("phone")}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>
            {t.email}
          </label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" className="field" {...aria("email")} />
          {fieldErr("email")}
        </div>
      </div>
      <p className="-mt-3 text-sm text-muted">{t.contactHint}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-topic`} className={label}>
            {t.topic}
          </label>
          <select id={`${id}-topic`} name="topic" value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="field">
            {(Object.keys(t.topics) as Topic[]).map((k) => (
              <option key={k} value={k}>
                {t.topics[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-sku`} className={label}>
            {t.sku}
          </label>
          <input id={`${id}-sku`} name="sku" defaultValue={initialSku} className="field mono-num" autoComplete="off" />
        </div>
      </div>

      {topic === "fitment" && (
        <fieldset className="grid gap-4 rounded-2xl bg-paper-2 p-4 ring-1 ring-line sm:p-5">
          <legend className="float-left w-full font-medium text-petrol-900">{t.vehicleTitle}</legend>
          <p className="clear-both -mt-2 text-sm text-muted">{t.vehicleHint}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={`${id}-make`} className={label}>{t.make}</label>
              <select id={`${id}-make`} name="make" value={make} onChange={(e) => setMake(e.target.value as Make | "")} className="field">
                <option value="">{t.choose}</option>
                <option value="hyundai">Hyundai</option>
                <option value="kia">Kia</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-model`} className={label}>{t.model}</label>
              <select key={make} id={`${id}-model`} name="model" defaultValue="" disabled={!make} className="field">
                <option value="">{t.choose}</option>
                {make && DEMO_MODELS[make].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-year`} className={label}>{t.year}</label>
              <select id={`${id}-year`} name="year" defaultValue="" className="field" {...aria("year")}>
                <option value="">{t.choose}</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {fieldErr("year")}
            </div>
            <div>
              <label htmlFor={`${id}-engine`} className={label}>{t.engine}</label>
              <input id={`${id}-engine`} name="engine" maxLength={40} placeholder="1.6 MPI" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-vin`} className={label}>{t.vin}</label>
              <input id={`${id}-vin`} name="vin" maxLength={17} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="field mono-num uppercase" aria-describedby={errors.vin ? `${id}-vin-err` : `${id}-vin-hint`} aria-invalid={Boolean(errors.vin)} />
              {fieldErr("vin") ?? <p id={`${id}-vin-hint`} className="mt-1.5 text-xs text-muted">{t.vinHint}</p>}
            </div>
          </div>
          <p className="text-xs text-muted">{t.photoNote}</p>
        </fieldset>
      )}

      <div>
        <label htmlFor={`${id}-message`} className={label}>
          {t.message}
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={5}
          placeholder={t.messageHint}
          className="field min-h-36 py-3"
          {...aria("message")}
        />
        {fieldErr("message")}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-[var(--petrol-700)]" {...aria("consent")} />
          {t.consent}
        </label>
        {fieldErr("consent")}
      </div>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
          {errors.form}
        </p>
      )}

      <button type="submit" disabled={state === "sending"} className="pill-cta on-light justify-self-start disabled:opacity-60">
        <span className="pill-label">{state === "sending" ? t.sending : t.submit}</span>
        <span className="pill-circle" aria-hidden="true">
          <ArrowRight className="size-5" />
        </span>
      </button>
    </form>
  );
}
