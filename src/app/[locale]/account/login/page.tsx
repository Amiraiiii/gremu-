import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { googleConfigured, safeNext } from "@/lib/auth/google";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${getDictionary(locale).account.login.title} — gremu`, robots: { index: false, follow: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const next = safeNext(one(sp.next), locale);
  if (await getCurrentUser()) redirect(next);

  const t = getDictionary(locale).account.login;
  const error = one(sp.error);
  const errorText = (t.errors as Record<string, string>)[error] ?? (error ? t.errors.failed : "");
  const configured = googleConfigured();
  const dev = devLoginEnabled();
  const googleHref = `/api/auth/google?${new URLSearchParams({ locale, next })}`;

  return (
    <section className="bg-brand relative flex min-h-svh items-center overflow-hidden pt-28 pb-16 text-cream">
      <svg aria-hidden="true" viewBox="0 0 1440 800" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-cream/10" fill="none">
        <path d="M-40 760 C 380 200, 1000 80, 1500 380" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="6 10" />
      </svg>
      <div className="wrap relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center">
        <div>
          <h1 className="display-lg max-w-[12ch]">{t.title}</h1>
          <p className="mt-6 max-w-[44ch] text-lg text-cream/75">{t.lead}</p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[26px] bg-paper p-7 text-ink ring-1 ring-line">
            {errorText && (
              <p role="alert" className="mb-5 rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad ring-1 ring-bad/25">
                {errorText}
              </p>
            )}
            {configured ? (
              <a href={googleHref} className="btn w-full bg-white text-ink ring-1 ring-line hover:ring-ink-2">
                <GoogleMark />
                {t.google}
              </a>
            ) : (
              <>
                <button type="button" disabled className="btn w-full bg-white text-ink ring-1 ring-line">
                  <GoogleMark />
                  {t.google}
                </button>
                <p className="mt-4 text-sm text-ink-2">{t.notConfigured}</p>
              </>
            )}
            <p className="mt-4 text-sm text-muted">{t.privacy}</p>
            <Link href={`/${locale}/catalog`} className="link-draw mt-5 inline-flex min-h-11 items-center text-sm font-medium text-petrol-700">
              {t.guest}
            </Link>
          </div>

          {dev && (
            <form method="post" action="/api/auth/dev" className="rounded-[26px] border border-dashed border-cream/30 bg-white/5 p-6">
              <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-wider uppercase">
                <span className="mono-num rounded bg-cream/90 px-1.5 text-[0.65rem] text-petrol-900">dev</span>
                {t.devTitle}
              </p>
              <p className="mt-2 text-sm text-cream/70">{t.devLead}</p>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="next" value={next} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-cream/80">{t.devName}</span>
                  <input name="name" required minLength={2} maxLength={80} defaultValue="Test Client" className="field" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-cream/80">{t.devEmail}</span>
                  <input name="email" type="email" required defaultValue="test.client@example.test" className="field" />
                </label>
              </div>
              <button type="submit" className="btn btn-cream mt-4 w-full">
                {t.devSubmit}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
