import Link from "next/link";

export default function NotFound() {
  return (
    <section className="bg-brand flex min-h-[80svh] items-center text-cream">
      <div className="wrap py-32">
        <p className="mono-num text-glow">404</p>
        <h1 className="display-xl mt-4 max-w-[14ch]">Страница не найдена</h1>
        <p className="mt-6 max-w-[48ch] text-lg text-cream/75">Sahifa topilmadi. Проверьте адрес или перейдите в каталог.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/ru/catalog" className="pill-cta">
            <span className="pill-label">Каталог</span>
          </Link>
          <Link href="/uz/catalog" className="pill-cta">
            <span className="pill-label">Katalog</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
