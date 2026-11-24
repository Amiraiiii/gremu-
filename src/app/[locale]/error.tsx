"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-brand flex min-h-[70svh] items-center text-cream">
      <div className="wrap py-32">
        <h1 className="display-lg max-w-[16ch]">Что-то пошло не так · Xatolik yuz berdi</h1>
        <p className="mt-6 max-w-[48ch] text-lg text-cream/75">
          Попробуйте обновить страницу. Sahifani yangilab koʻring.
        </p>
        <button type="button" onClick={reset} className="pill-cta mt-8">
          <span className="pill-label">Повторить · Qayta urinish</span>
        </button>
      </div>
    </section>
  );
}
