"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { CatalogQuery } from "@/features/catalog/types";
import { DEMO_MODELS, YEARS, type Make } from "@/components/home/vehicle-data";

type C = Dictionary["catalog"];
type Cat = { slug: string; name: string };

/** Build the listing URL from a form, dropping empty fields and the page number. */
function urlFrom(form: HTMLFormElement, basePath: string): string {
  const p = new URLSearchParams();
  for (const [k, v] of new FormData(form)) {
    const s = String(v).trim();
    if (!s || k === "page" || (k === "sort" && s === "relevance")) continue; // relevance is the default
    p.set(k, s);
  }
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Catalog filters. Selects, the make switch and "in stock" apply at once; prices apply on Enter
 * or the button. Without JavaScript it is a plain GET form (the submit button stays usable).
 */
export function FilterPanel({ q, c, categories, basePath, fixedCategory }: { q: CatalogQuery; c: C; categories: Cat[]; basePath: string; fixedCategory?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [make, setMake] = useState<Make | "">(q.make ?? "");

  const go = (form: HTMLFormElement) => start(() => router.push(urlFrom(form, basePath), { scroll: false }));
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    go(e.currentTarget);
  };
  const apply = (e: { currentTarget: HTMLElement }) => {
    const form = e.currentTarget.closest("form");
    if (form) go(form);
  };

  const label = "mb-1.5 block text-xs font-medium tracking-wider text-muted uppercase";
  const models = make ? [{ group: make === "kia" ? "Kia" : "Hyundai", list: DEMO_MODELS[make] }] : [
    { group: "Hyundai", list: DEMO_MODELS.hyundai },
    { group: "Kia", list: DEMO_MODELS.kia },
  ];

  return (
    <form action={basePath} method="get" onSubmit={onSubmit} aria-busy={pending} className={`grid gap-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      {q.q && <input type="hidden" name="q" value={q.q} />}
      {q.sort && <input type="hidden" name="sort" value={q.sort} />}

      <fieldset>
        <legend className={label}>{c.make}</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { v: "", l: c.anyMake },
            { v: "hyundai", l: "Hyundai" },
            { v: "kia", l: "Kia" },
          ].map((o) => (
            <label
              key={o.v}
              className="flex h-11 cursor-pointer items-center justify-center rounded-full text-sm ring-1 ring-line transition-colors has-[:checked]:bg-petrol-900 has-[:checked]:text-cream has-[:checked]:ring-petrol-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
            >
              <input
                type="radio"
                name="make"
                value={o.v}
                checked={make === o.v}
                onChange={(e) => {
                  setMake(o.v as Make | "");
                  const form = e.currentTarget.form!;
                  const model = form.elements.namedItem("model") as HTMLSelectElement | null;
                  // A model of the other make no longer applies.
                  if (model && o.v && model.value && !(DEMO_MODELS[o.v as Make] as readonly string[]).includes(model.value)) model.value = "";
                  go(form);
                }}
                className="sr-only"
              />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="f-model" className={label}>{c.model}</label>
        <select key={make} id="f-model" name="model" defaultValue={q.model ?? ""} onChange={apply} className="field">
          <option value="">{c.anyModel}</option>
          {models.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.list.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-year" className={label}>{c.year}</label>
        <select id="f-year" name="year" defaultValue={q.year ?? ""} onChange={apply} className="field">
          <option value="">{c.anyYear}</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {!fixedCategory && (
        <div>
          <label htmlFor="f-cat" className={label}>{c.category}</label>
          <select id="f-cat" name="category" defaultValue={q.category ?? ""} onChange={apply} className="field">
            <option value="">{c.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend className={label}>{c.price}</legend>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input name="min" inputMode="numeric" pattern="[0-9]*" placeholder={c.from} aria-label={`${c.price} ${c.from}`} defaultValue={q.minPrice ?? ""} className="field" />
          <input name="max" inputMode="numeric" pattern="[0-9]*" placeholder={c.to} aria-label={`${c.price} ${c.to}`} defaultValue={q.maxPrice ?? ""} className="field" />
          <button type="submit" aria-label={c.apply} className="grid size-12 place-items-center rounded-full bg-petrol-900 text-cream transition-colors hover:bg-petrol-700">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="stock" value="1" defaultChecked={q.availability === "in_stock"} onChange={apply} className="size-5 accent-[var(--petrol-700)]" />
        {c.inStock}
      </label>
    </form>
  );
}

/** Sort control above the results; applies at once and keeps every other filter. */
export function SortSelect({ q, c, basePath }: { q: CatalogQuery; c: C; basePath: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form action={basePath} method="get" className="flex items-center gap-2" aria-busy={pending}>
      {Object.entries({ q: q.q, make: q.make, model: q.model, year: q.year, category: q.category, min: q.minPrice, max: q.maxPrice, stock: q.availability ? "1" : undefined }).map(([k, v]) =>
        v != null && v !== "" ? <input key={k} type="hidden" name={k} value={String(v)} /> : null,
      )}
      <label htmlFor="f-sort" className="text-sm whitespace-nowrap text-muted">{c.sort}:</label>
      <select
        id="f-sort"
        name="sort"
        defaultValue={q.sort ?? "relevance"}
        onChange={(e) => {
          const form = e.currentTarget.form!;
          start(() => router.push(urlFrom(form, basePath), { scroll: false }));
        }}
        className={`field h-10 min-h-10 w-auto min-w-[13.5rem] py-0 text-sm ${pending ? "opacity-60" : ""}`}
      >
        {(Object.keys(c.sorts) as (keyof C["sorts"])[]).map((k) => (
          <option key={k} value={k}>{c.sorts[k]}</option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-full px-3 text-sm ring-1 ring-line">OK</button>
      </noscript>
    </form>
  );
}
