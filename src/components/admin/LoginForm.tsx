"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/[locale]/admin/actions";

const MESSAGES: Record<NonNullable<LoginState["error"]>, string> = {
  invalid: "Неверный логин или пароль",
  rate_limited: "Слишком много попыток. Подождите 15 минут.",
  not_configured: "Вход администратора не настроен: задайте ADMIN_PASSWORD_HASH (см. README).",
};

export function LoginForm({ locale }: { locale: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="adm-user" className="mb-1.5 block text-sm font-medium text-ink">
          Логин
        </label>
        <input id="adm-user" name="username" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="adm-pass" className="mb-1.5 block text-sm font-medium text-ink">
          Пароль
        </label>
        <input id="adm-pass" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
          {MESSAGES[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-petrol-900 font-medium text-cream transition-colors hover:bg-petrol-700 disabled:opacity-60"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
