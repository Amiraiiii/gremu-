"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { DEMO_MODELS, YEARS, type Make } from "./vehicle-data";

type Tab = "vehicle" | "oem";

export function PartFinder({ locale, t }: { locale: Locale; t: Dictionary["hero"] }) {
  const router = useRouter();
  const id = useId();
  const [tab, setTab] = useState<Tab>("vehicle");
  const [make, setMake] = useState<Make>("hyundai");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [oem, setOem] = useState("");
  const [oemError, setOemError] = useState(false);

  const submitVehicle = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams({ make });
    if (model) q.set("model", model);
    if (year) q.set("year", year);
    router.push(`/${locale}/catalog?${q.toString()}`);
  };

  const submitOem = (e: FormEvent) => {
    e.preventDefault();
    const value = oem.trim();
    if (value.length < 3) {
      setOemError(true);
      return;
    }
    router.push(`/${locale}/search?oem=${encodeURIComponent(value)}`);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "vehicle", label: t.tabVehicle },
    { key: "oem", label: t.tabOem },
  ];

  const label = "mb-1.5 block font-display text-xs font-semibold tracking-wider text-ink-2 uppercase";

  return (
    <div className="rounded-[var(--radius-lg)] bg-paper p-2 text-ink shadow-[0_30px_80px_-30px_oklch(0%_0_0/0.7)]">
      <div role="tablist" aria-label={t.cta} className="grid grid-cols-2 gap-1 rounded-[calc(var(--radius-lg)-6px)] bg-paper-2 p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            id={`${id}-tab-${item.key}`}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            aria-controls={`${id}-panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={`min-h-11 rounded-[var(--radius-md)] px-2 font-display text-[0.78rem] font-semibold whitespace-nowrap transition-colors sm:px-3 sm:text-sm duration-200 ${
              tab === item.key ? "bg-paper text-petrol-900 shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === "vehicle" ? (
          <form
            id={`${id}-panel-vehicle`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-vehicle`}
            onSubmit={submitVehicle}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <fieldset className="sm:col-span-2">
              <legend className={label}>{t.make}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(DEMO_MODELS) as Make[]).map((m) => (
                  <label
                    key={m}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border font-display font-semibold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                      make === m
                        ? "border-petrol-700 bg-petrol-800 text-cream"
                        : "border-line text-ink-2 hover:border-ink-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="make"
                      value={m}
                      checked={make === m}
                      onChange={() => {
                        setMake(m);
                        setModel("");
                      }}
                      className="sr-only"
                    />
                    {m === "hyundai" ? "Hyundai" : "Kia"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor={`${id}-model`} className={label}>
                {t.model}
              </label>
              <select id={`${id}-model`} className="field" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">{t.choose}</option>
                {DEMO_MODELS[make].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-year`} className={label}>
                {t.year}
              </label>
              <select id={`${id}-year`} className="field" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">{t.choose}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-engine`} className={label}>
                {t.engine}
              </label>
              <select id={`${id}-engine`} className="field" disabled aria-describedby={`${id}-engine-hint`}>
                <option>{t.anyEngine}</option>
              </select>
              <p id={`${id}-engine-hint`} className="mt-1.5 text-sm text-muted">
                {t.engineHint}
              </p>
            </div>
            <button type="submit" className="btn btn-primary sm:col-span-2">
              {t.cta}
              <ArrowRight />
            </button>
          </form>
        ) : (
          <form
            id={`${id}-panel-oem`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-oem`}
            onSubmit={submitOem}
            noValidate
            className="grid gap-4"
          >
            <div>
              <label htmlFor={`${id}-oem`} className={label}>
                {t.oemLabel}
              </label>
              <input
                id={`${id}-oem`}
                className="field mono-num"
                value={oem}
                onChange={(e) => {
                  setOem(e.target.value);
                  if (oemError) setOemError(false);
                }}
                placeholder={t.oemPlaceholder}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={oemError}
                aria-describedby={`${id}-oem-hint`}
              />
              <p id={`${id}-oem-hint`} className={`mt-1.5 text-sm ${oemError ? "text-bad" : "text-muted"}`}>
                {t.oemHint}
              </p>
            </div>
            <button type="submit" className="btn btn-primary">
              {t.oemCta}
              <ArrowRight />
            </button>
          </form>
        )}
        <a
          href={`/${locale}/contact?topic=fitment`}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-petrol-700"
        >
          <span className="link-draw">{t.unsure}</span>
        </a>
      </div>
    </div>
  );
}
