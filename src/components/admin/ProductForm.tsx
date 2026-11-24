"use client";

import { startTransition, useActionState, useState } from "react";
import { saveProductAction, type ActionState } from "@/app/[locale]/admin/catalog-actions";
import { AVAIL_LABEL, FITMENT_LABEL, PART_TYPE_LABEL } from "@/features/catalog/labels";
import { DEMO_MODELS } from "@/components/home/vehicle-data";

type Fit = { make: "hyundai" | "kia"; model: string; generation: string; yearFrom: string; yearTo: string; engine: string; status: string };
type Spec = { ru: string; uz: string; value: string };

export type ProductFormValues = {
  id: string | null;
  slug: string;
  sku: string;
  oemNumber: string;
  categorySlug: string;
  brand: string;
  vehicleMake: "hyundai" | "kia";
  partType: string;
  titleRu: string;
  titleUz: string;
  descriptionRu: string;
  descriptionUz: string;
  priceUzs: string;
  stockQuantity: string;
  availability: string;
  isPublished: boolean;
  imageUrl: string;
  specs: Spec[];
  fitments: Fit[];
};

const ERR: Record<string, string> = {
  slug: "Только латиница, цифры и дефисы: front-brake-pads-kia-cerato",
  sku: "Артикул: латиница, цифры, дефис; 2–40 символов",
  category: "Выберите категорию",
  title: "Название — от 2 символов",
  price: "Цена в сумах — целое число ≥ 0",
  stock: "Остаток — целое число ≥ 0 или пусто",
  image: "Фото: путь вида /products/имя.webp или ссылка https://…",
  stock_zero: "При остатке 0 выберите «Нет в наличии» или «Под заказ»",
  model: "Укажите модель",
  years: "Год «по» не может быть раньше года «с»",
  duplicate_sku: "Такой артикул уже есть",
  duplicate_slug: "Такой адрес (slug) уже есть",
  not_found: "Товар не найден — возможно, его удалили",
  unauthorized: "Сессия истекла — войдите снова",
  invalid: "Проверьте отмеченные поля",
};

const label = "mb-1.5 block text-sm font-medium text-ink";
const card = "rounded-[22px] bg-paper p-6 ring-1 ring-line";

/** Product editor: main fields, specs and fitment rows. Validation is repeated on the server. */
export function ProductForm({
  locale,
  initial,
  categories,
  brands,
}: {
  locale: string;
  initial: ProductFormValues;
  categories: { slug: string; nameRu: string }[];
  brands: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [fits, setFits] = useState<Fit[]>(initial.fitments);
  const [specs, setSpecs] = useState<Spec[]>(initial.specs);
  const f = state.fields ?? {};
  const fieldErr = (k: string) => (f[k] ? <p className="mt-1 text-xs text-bad">{ERR[f[k]] ?? ERR[k] ?? f[k]}</p> : null);
  const inv = (k: string) => ({ "aria-invalid": Boolean(f[k]) });
  const fitErr = (i: number) => Object.entries(f).find(([k]) => k.startsWith(`fitments.${i}.`))?.[1];

  const setFit = (i: number, patch: Partial<Fit>) => setFits((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(e) => {
        // Submit without React 19's automatic form reset, so edits survive a validation error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={initial.id ?? ""} />
      <input type="hidden" name="fitments" value={JSON.stringify(fits)} />
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.ru || s.uz || s.value))} />

      {state.error && (
        <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
          {ERR[state.error] ?? "Не удалось сохранить"}
        </p>
      )}

      <section className={card}>
        <h2 className="mb-5 text-lg font-medium text-petrol-900">Основное</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="titleRu" className={label}>Название (RU)</label>
            <input id="titleRu" name="titleRu" defaultValue={initial.titleRu} className="field" {...inv("titleRu")} />
            {fieldErr("titleRu")}
          </div>
          <div>
            <label htmlFor="titleUz" className={label}>Название (UZ)</label>
            <input id="titleUz" name="titleUz" defaultValue={initial.titleUz} className="field" {...inv("titleUz")} />
            {fieldErr("titleUz")}
          </div>
          <div>
            <label htmlFor="sku" className={label}>Артикул (SKU)</label>
            <input id="sku" name="sku" defaultValue={initial.sku} className="field mono-num uppercase" {...inv("sku")} />
            {fieldErr("sku")}
          </div>
          <div>
            <label htmlFor="oemNumber" className={label}>OEM-номер</label>
            <input id="oemNumber" name="oemNumber" defaultValue={initial.oemNumber} className="field mono-num" />
          </div>
          <div>
            <label htmlFor="slug" className={label}>Адрес страницы (slug)</label>
            <input id="slug" name="slug" defaultValue={initial.slug} className="field mono-num" {...inv("slug")} />
            {fieldErr("slug")}
          </div>
          <div>
            <label htmlFor="categorySlug" className={label}>Категория</label>
            <select id="categorySlug" name="categorySlug" defaultValue={initial.categorySlug} className="field" {...inv("categorySlug")}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nameRu}</option>
              ))}
            </select>
            {fieldErr("categorySlug")}
          </div>
          <div>
            <label htmlFor="brand" className={label}>Производитель детали (бренд)</label>
            <input id="brand" name="brand" list="brand-list" defaultValue={initial.brand} className="field" />
            <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
            <p className="mt-1 text-xs text-muted">Новый бренд создаётся автоматически.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vehicleMake" className={label}>Марка авто</label>
              <select id="vehicleMake" name="vehicleMake" defaultValue={initial.vehicleMake} className="field">
                <option value="hyundai">Hyundai</option>
                <option value="kia">Kia</option>
              </select>
            </div>
            <div>
              <label htmlFor="partType" className={label}>Состояние</label>
              <select id="partType" name="partType" defaultValue={initial.partType} className="field">
                {Object.entries(PART_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="imageUrl" className={label}>Фото</label>
            <div className="flex items-start gap-4">
              {initial.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- small admin preview of the stored path
                <img src={initial.imageUrl} alt="" className="size-20 shrink-0 rounded-xl bg-[#f3f6f7] object-contain p-1 ring-1 ring-line" />
              )}
              <div className="min-w-0 flex-1">
                <input id="imageUrl" name="imageUrl" defaultValue={initial.imageUrl} placeholder="/products/23040-2e000.webp или https://…" className="field mono-num" {...inv("imageUrl")} />
                {fieldErr("imageUrl")}
                <p className="mt-1 text-xs text-muted">Файл кладётся в папку public/products. Пусто — показывается иконка категории.</p>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="descriptionRu" className={label}>Описание (RU)</label>
            <textarea id="descriptionRu" name="descriptionRu" rows={4} defaultValue={initial.descriptionRu} className="field py-2.5" />
          </div>
          <div>
            <label htmlFor="descriptionUz" className={label}>Описание (UZ)</label>
            <textarea id="descriptionUz" name="descriptionUz" rows={4} defaultValue={initial.descriptionUz} className="field py-2.5" />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-5 text-lg font-medium text-petrol-900">Цена, наличие, публикация</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="priceUzs" className={label}>Цена, сум</label>
            <input id="priceUzs" name="priceUzs" inputMode="numeric" defaultValue={initial.priceUzs} className="field mono-num" {...inv("priceUzs")} />
            {fieldErr("priceUzs")}
          </div>
          <div>
            <label htmlFor="stockQuantity" className={label}>Остаток, шт.</label>
            <input id="stockQuantity" name="stockQuantity" inputMode="numeric" placeholder="не учитывается" defaultValue={initial.stockQuantity} className="field mono-num" {...inv("stockQuantity")} />
            {fieldErr("stockQuantity")}
          </div>
          <div>
            <label htmlFor="availability" className={label}>Наличие</label>
            <select id="availability" name="availability" defaultValue={initial.availability} className="field" {...inv("availability")}>
              {Object.entries(AVAIL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {fieldErr("availability")}
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end">
            <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} className="size-5 accent-[var(--petrol-700)]" />
            <span className="text-sm text-ink">Опубликован на сайте</span>
          </label>
        </div>
      </section>

      <section className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-petrol-900">Совместимость</h2>
          <button
            type="button"
            onClick={() => setFits((xs) => [...xs, { make: initial.vehicleMake, model: "", generation: "", yearFrom: "", yearTo: "", engine: "", status: "unverified" }])}
            className="h-10 rounded-full px-4 text-sm font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2"
          >
            + Добавить строку
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">Покупатель видит «Подходит» только для строк со статусом «Подтверждена». Остальные просят уточнить у менеджера.</p>
        {fits.length === 0 ? (
          <p className="text-sm text-ink-2">Строк нет — совместимость не указана.</p>
        ) : (
          <ul className="grid gap-3">
            {fits.map((x, i) => (
              <li key={i} className="grid grid-cols-2 gap-2 rounded-2xl p-3 ring-1 ring-line sm:grid-cols-4 lg:grid-cols-[110px_1.2fr_1fr_90px_90px_1fr_1.2fr_auto]">
                <select aria-label="Марка" value={x.make} onChange={(e) => setFit(i, { make: e.target.value as Fit["make"] })} className="field">
                  <option value="hyundai">Hyundai</option>
                  <option value="kia">Kia</option>
                </select>
                <input aria-label="Модель" list={`models-${x.make}`} value={x.model} onChange={(e) => setFit(i, { model: e.target.value })} placeholder="Модель" className="field" />
                <input aria-label="Поколение" value={x.generation} onChange={(e) => setFit(i, { generation: e.target.value })} placeholder="Поколение" className="field" />
                <input aria-label="Год с" inputMode="numeric" value={x.yearFrom} onChange={(e) => setFit(i, { yearFrom: e.target.value })} placeholder="с" className="field mono-num" />
                <input aria-label="Год по" inputMode="numeric" value={x.yearTo} onChange={(e) => setFit(i, { yearTo: e.target.value })} placeholder="по" className="field mono-num" />
                <input aria-label="Двигатель" value={x.engine} onChange={(e) => setFit(i, { engine: e.target.value })} placeholder="Двигатель" className="field" />
                <select aria-label="Статус совместимости" value={x.status} onChange={(e) => setFit(i, { status: e.target.value })} className="field">
                  {Object.entries(FITMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button type="button" onClick={() => setFits((xs) => xs.filter((_, j) => j !== i))} className="h-12 rounded-full px-3 text-sm text-bad hover:bg-bad/8" aria-label={`Удалить строку ${i + 1}`}>
                  Удалить
                </button>
                {fitErr(i) && <p className="col-span-full text-xs text-bad">{ERR[fitErr(i)!] ?? "Проверьте строку: годы — четыре цифры"}</p>}
              </li>
            ))}
          </ul>
        )}
        {(["hyundai", "kia"] as const).map((m) => (
          <datalist key={m} id={`models-${m}`}>{DEMO_MODELS[m].map((x) => <option key={x} value={x} />)}</datalist>
        ))}
      </section>

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-petrol-900">Характеристики</h2>
          <button type="button" onClick={() => setSpecs((xs) => [...xs, { ru: "", uz: "", value: "" }])} className="h-10 rounded-full px-4 text-sm font-medium text-petrol-900 ring-1 ring-line hover:bg-paper-2">
            + Добавить
          </button>
        </div>
        {specs.length === 0 ? (
          <p className="text-sm text-ink-2">Характеристик нет.</p>
        ) : (
          <ul className="grid gap-2">
            {specs.map((s, i) => (
              <li key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input aria-label="Название (RU)" value={s.ru} onChange={(e) => setSpecs((xs) => xs.map((x, j) => (j === i ? { ...x, ru: e.target.value } : x)))} placeholder="Название RU" className="field" />
                <input aria-label="Название (UZ)" value={s.uz} onChange={(e) => setSpecs((xs) => xs.map((x, j) => (j === i ? { ...x, uz: e.target.value } : x)))} placeholder="Название UZ" className="field" />
                <input aria-label="Значение" value={s.value} onChange={(e) => setSpecs((xs) => xs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Значение" className="field" />
                <button type="button" onClick={() => setSpecs((xs) => xs.filter((_, j) => j !== i))} className="h-12 rounded-full px-3 text-sm text-bad hover:bg-bad/8">
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary shadow-lg">
          {pending ? "Сохраняем…" : "Сохранить товар"}
        </button>
      </div>
    </form>
  );
}
