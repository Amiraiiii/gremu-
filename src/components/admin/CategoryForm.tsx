"use client";

import { startTransition, useActionState } from "react";
import { saveCategoryAction, type ActionState } from "@/app/[locale]/admin/catalog-actions";

type Cat = { slug: string; nameRu: string; nameUz: string; partsRu: string; partsUz: string; sortOrder: number; isPublished: boolean };

const ERR: Record<string, string> = {
  duplicate: "Категория с таким slug уже есть",
  not_found: "Категория не найдена",
  invalid: "Проверьте поля: slug — латиница и дефисы, названия от 2 символов",
  unauthorized: "Нужны права администратора",
};

/** One category row (edit) or the "new category" form when `initial` is null. */
export function CategoryForm({ locale, initial }: { locale: string; initial: Cat | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategoryAction, {});
  const f = state.fields ?? {};
  const v = initial ?? { slug: "", nameRu: "", nameUz: "", partsRu: "", partsUz: "", sortOrder: 100, isPublished: true };
  const id = initial ? `cat-${initial.slug}` : "cat-new";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[140px_1fr_1fr_1.4fr_1.4fr_80px_auto_auto] lg:items-center"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="originalSlug" value={initial?.slug ?? ""} />
      <input aria-label="Slug" name="slug" defaultValue={v.slug} placeholder="slug" className="field mono-num" aria-invalid={Boolean(f.slug)} />
      <input aria-label="Название RU" name="nameRu" defaultValue={v.nameRu} placeholder="Название RU" className="field" aria-invalid={Boolean(f.nameRu)} />
      <input aria-label="Название UZ" name="nameUz" defaultValue={v.nameUz} placeholder="Название UZ" className="field" aria-invalid={Boolean(f.nameUz)} />
      <input aria-label="Что внутри RU" name="partsRu" defaultValue={v.partsRu} placeholder="Что внутри (RU)" className="field" />
      <input aria-label="Что внутри UZ" name="partsUz" defaultValue={v.partsUz} placeholder="Что внутри (UZ)" className="field" />
      <input aria-label="Порядок" name="sortOrder" inputMode="numeric" defaultValue={v.sortOrder} className="field mono-num" />
      <label className="inline-flex min-h-12 items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" name="isPublished" defaultChecked={v.isPublished} className="size-4 accent-[var(--petrol-700)]" />
        Видна
      </label>
      <button type="submit" disabled={pending} className="h-11 rounded-full bg-petrol-900 px-4 text-sm font-medium text-cream disabled:opacity-60">
        {initial ? "Сохранить" : "Добавить"}
      </button>
      {(state.error || state.ok) && (
        <p id={`${id}-msg`} role={state.error ? "alert" : "status"} className={`col-span-full text-xs ${state.error ? "text-bad" : "text-ok"}`}>
          {state.error ? (ERR[state.error] ?? "Не удалось сохранить") : "Сохранено"}
        </p>
      )}
    </form>
  );
}
