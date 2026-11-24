"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeStatusAction, type StatusState } from "@/app/[locale]/admin/actions";

const ERRORS: Record<NonNullable<StatusState["error"]>, string> = {
  invalid: "Проверьте данные формы",
  not_found: "Заказ не найден",
  not_allowed: "Такой переход статуса недопустим",
  stale: "Статус уже изменил кто-то другой — обновите страницу",
  unauthorized: "Сессия истекла — войдите снова",
};

export function StatusForm({
  locale,
  number,
  current,
  options,
}: {
  locale: string;
  number: string;
  current: string;
  options: { value: string; label: string; danger?: boolean }[];
}) {
  const [state, action, pending] = useActionState<StatusState, FormData>(changeStatusAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!options.length) return <p className="text-sm text-muted">Заказ в конечном статусе — изменить нельзя.</p>;

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="expected" value={current} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Новый статус</legend>
        <div className="grid gap-2">
          {options.map((o, i) => (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-line has-[:checked]:ring-2 ${o.danger ? "has-[:checked]:ring-bad" : "has-[:checked]:ring-petrol-700"}`}
            >
              <input type="radio" name="to" value={o.value} defaultChecked={i === 0} className="size-4 accent-[var(--petrol-700)]" />
              <span className={o.danger ? "text-bad" : "text-ink"}>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="st-note" className="mb-1.5 block text-sm font-medium text-ink">
          Комментарий (виден в истории)
        </label>
        <textarea id="st-note" name="note" rows={2} maxLength={500} className="field min-h-20 py-2.5" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
          {ERRORS[state.error]}
        </p>
      )}
      {state.ok && (
        <p role="status" className="rounded-xl bg-ok/12 px-4 py-3 text-sm text-ok ring-1 ring-ok/30">
          Статус обновлён
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center rounded-full bg-petrol-900 font-medium text-cream hover:bg-petrol-700 disabled:opacity-60">
        {pending ? "Сохраняем…" : "Изменить статус"}
      </button>
    </form>
  );
}
