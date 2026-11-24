import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/auth/admin";
import { googleConfigured } from "@/lib/auth/google";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Вход — gremu admin", robots: { index: false, follow: false } };

export default async function AdminLogin({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getAdminSession()) redirect(`/${locale}/admin`);
  const user = await getCurrentUser().catch(() => null);
  const google = googleConfigured();

  return (
    <div className="bg-brand grid min-h-svh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-[26px] bg-paper p-7 ring-1 ring-line">
          <h1 className="text-2xl font-medium tracking-[-0.03em] text-petrol-900">Вход в админку</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Только для сотрудников магазина</p>

          {user && (
            <p role="alert" className="mb-5 rounded-xl bg-warn/12 px-4 py-3 text-sm text-ink-2 ring-1 ring-warn/30">
              Аккаунт {user.email} не имеет доступа к админке. Владелец добавляет сотрудников в ADMIN_EMAILS или STAFF_EMAILS на сервере.
            </p>
          )}

          {google && (
            <>
              <a href={`/api/auth/google?${new URLSearchParams({ locale, next: `/${locale}/admin` })}`} className="btn w-full bg-white text-ink ring-1 ring-line hover:ring-ink-2">
                Войти через Google (сотрудники)
              </a>
              <p className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" /> или пароль владельца <span className="h-px flex-1 bg-line" />
              </p>
            </>
          )}
          <LoginForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
