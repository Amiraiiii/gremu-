import Link from "next/link";
import { Heading } from "@/components/motion/Heading";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight, PlusIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { CategoryStrip } from "./CategoryStrip";
import { PartFinder } from "./PartFinder";

export function Categories({ locale, t }: { locale: Locale; t: Dictionary["categories"] }) {
  return (
    <section aria-labelledby="cat-title" className="bg-paper pt-20 pb-14 md:pt-28 md:pb-20">
      <div className="wrap grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
        <Heading id="cat-title" text={t.title} accent={t.titleAccent} tone="onLight" className="display-lg max-w-[12ch] text-petrol-900" />
        <Reveal className="lg:pb-2">
          <p data-reveal-item className="max-w-[44ch] text-lg text-ink-2">
            {t.lead}
          </p>
          <Link data-reveal-item href={`/${locale}/catalog`} className="pill-cta on-light mt-7">
            <span className="pill-label">{t.all}</span>
            <span className="pill-circle" aria-hidden="true">
              <ArrowRight className="size-5" />
            </span>
          </Link>
        </Reveal>
      </div>
      <div className="mt-10 md:mt-14">
        <CategoryStrip locale={locale} items={t.items} />
      </div>
    </section>
  );
}

export function FinderSection({
  locale,
  t,
}: {
  locale: Locale;
  t: { finder: Dictionary["finder"]; hero: Dictionary["hero"]; howTo: Dictionary["howTo"] };
}) {
  const statuses = [
    { ...t.howTo.statuses.verified, dot: "bg-ok" },
    { ...t.howTo.statuses.unverified, dot: "bg-warn" },
    { ...t.howTo.statuses.notCompatible, dot: "bg-bad" },
  ];
  return (
    <section id="finder" aria-labelledby="finder-title" className="scroll-mt-20 bg-paper-2 py-20 md:py-28">
      <div className="wrap grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
        <div>
          <Heading id="finder-title" text={t.finder.title} tone="onLight" className="display-lg text-petrol-900" />
          <Reveal>
            <p data-reveal-item className="mt-6 max-w-[44ch] text-lg text-ink-2">
              {t.finder.lead}
            </p>
            <div data-reveal-item className="mt-10 border-t border-line pt-6">
              <h3 className="text-sm font-medium tracking-wider text-muted uppercase">{t.howTo.statusTitle}</h3>
              <ul className="mt-4 grid gap-3">
                {statuses.map((s) => (
                  <li key={s.label} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-2 rounded-full bg-paper px-3 py-1 text-xs font-medium whitespace-nowrap text-petrol-900 ring-1 ring-line">
                      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" />
                      {s.label}
                    </span>
                    <span className="text-sm text-ink-2">{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <div className="w-full max-w-xl lg:justify-self-end">
          <PartFinder locale={locale} t={t.hero} />
        </div>
      </div>
    </section>
  );
}

export function PartTypes({ t }: { t: Dictionary["partTypes"] }) {
  return (
    <section aria-labelledby="types-title" className="bg-brand py-20 text-cream md:py-28">
      <div className="wrap">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
          <Heading id="types-title" text={t.title} accent={t.titleAccent} tone="onDark" className="display-lg max-w-[14ch]" />
          <Reveal className="lg:pb-2">
            <p data-reveal-item className="max-w-[44ch] text-lg text-cream/75">
              {t.lead}
            </p>
          </Reveal>
        </div>
        <div className="mt-14 border-t border-white/15">
          {t.items.map((item, i) => (
            <article
              key={item.name}
              className="group grid grid-cols-1 gap-4 border-b border-white/15 py-10 md:grid-cols-[minmax(0,0.2fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-10 md:py-14"
            >
              <span className="mono-num text-sm text-glow">{String(i + 1).padStart(2, "0")}</span>
              <h3
                className={`text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.95] font-medium tracking-[-0.05em] transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-2 ${
                  i === 0 ? "text-grad-on-dark" : ""
                }`}
              >
                {item.name}
              </h3>
              <p className="max-w-[44ch] text-lg text-cream/75">{item.text}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-cream/60">{t.note}</p>
      </div>
    </section>
  );
}

export function Faq({ t }: { t: Dictionary["faq"] }) {
  return (
    <section aria-labelledby="faq-title" className="bg-paper-2 py-20 md:py-28">
      <div className="wrap grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Heading id="faq-title" text={t.title} accent={t.titleAccent} tone="onLight" className="display-lg text-petrol-900" />
        </div>
        <div className="border-t border-line">
          {t.items.map((item, i) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-5 py-6 text-lg font-medium text-petrol-900 [&::-webkit-details-marker]:hidden">
                <span className="mono-num text-sm font-normal text-petrol-600">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">{item.q}</span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper ring-1 ring-line transition-transform duration-300 group-open:rotate-45">
                  <PlusIcon className="size-4" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-6 pl-10 text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
