"use client";

import { startTransition, useActionState } from "react";
import { importCsvAction, type ImportState } from "@/app/[locale]/admin/catalog-actions";

export function CsvImportForm({ locale }: { locale: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importCsvAction, {});
  const r = state.report;
  return (
    <div className="grid gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="grid gap-4 rounded-[22px] bg-paper p-6 ring-1 ring-line"
      >
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="csv-file" className="mb-1.5 block text-sm font-medium text-ink">
            CSV-файл (до 2 МБ)
          </label>
          <input id="csv-file" name="file" type="file" accept=".csv,text/csv" required className="block text-sm file:mr-3 file:h-11 file:rounded-full file:border-0 file:bg-paper-2 file:px-4 file:text-petrol-900 file:ring-1 file:ring-line" />
        </div>
        <label className="inline-flex min-h-11 items-center gap-3 text-sm text-ink-2">
          <input type="checkbox" name="dryRun" defaultChecked className="size-4 accent-[var(--petrol-700)]" />
          Только проверить, ничего не записывать
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary justify-self-start">
          {pending ? "Проверяем…" : "Загрузить"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-bad">
            {state.error}
          </p>
        )}
      </form>

      {r && (
        <section aria-live="polite" className="rounded-[22px] bg-paper p-6 ring-1 ring-line">
          {r.ok ? (
            <p className="font-medium text-ok">
              {r.dryRun ? "Проверка пройдена — ошибок нет." : "Импорт выполнен."} Строк: {r.rows}, новых: {r.created}, обновится/обновлено: {r.updated}.
              {r.dryRun && " Снимите галочку «Только проверить» и загрузите файл ещё раз, чтобы записать."}
            </p>
          ) : (
            <>
              <p className="font-medium text-bad">
                Найдено ошибок: {r.errors.length}. Ничего не записано — исправьте файл и загрузите снова.
              </p>
              <div className="mt-4 max-h-96 overflow-auto rounded-xl ring-1 ring-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-paper-2 text-xs text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium">Строка</th>
                      <th className="px-3 py-2 font-medium">Поле</th>
                      <th className="px-3 py-2 font-medium">Ошибка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.errors.slice(0, 300).map((e, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="mono-num px-3 py-2">{e.row}</td>
                        <td className="mono-num px-3 py-2 text-ink-2">{e.field}</td>
                        <td className="px-3 py-2">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
