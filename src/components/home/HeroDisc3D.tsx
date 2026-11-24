"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/gsap";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { Heading } from "@/components/motion/Heading";
import { ArrowRight } from "@/components/ui/icons";

const BrakeDisc3D = dynamic(() => import("./BrakeDisc3D").then((m) => m.BrakeDisc3D), { ssr: false });

type T = {
  hero: Dictionary["hero"];
  cards: Dictionary["heroCards"];
  help: Dictionary["help"];
};

export function HeroDisc3D({ locale, t }: { locale: Locale; t: T }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.set("[data-in]", { visibility: "visible" })
          .from("[data-lead]", { y: 18, opacity: 0, duration: 0.8 }, 0.7)
          .from("[data-cta]", { y: 18, opacity: 0, duration: 0.8 }, 0.85)
          .from("[data-card]", { y: 40, opacity: 0, rotateX: -18, transformOrigin: "50% 100%", duration: 1, stagger: 0.1 }, 0.6)
          .from("[data-point]", { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, 1)
          .from("[data-point-rule]", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.1, stagger: 0.1, ease: "power2.inOut" }, 0.9);
      });
      mm.add(MQ.desktop, () => {
        // Content drifts up and fades as the scene keeps turning
        gsap.to("[data-hero-content]", {
          yPercent: -12,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-brand relative isolate min-h-[100svh] overflow-hidden text-cream" aria-labelledby="hero-title">
      {/* Glow + logo swoosh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[10%] right-[5%] -z-10 size-[70vmax] rounded-full bg-[radial-gradient(closest-side,oklch(60%_0.08_200/0.32),transparent)]"
      />
      <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-cream/15" fill="none">
        <path d="M-40 760 C 380 260, 980 120, 1500 380" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeDasharray="6 10" />
      </svg>

      <BrakeDisc3D className="absolute inset-x-0 top-0 -z-10 h-[100svh]" />

      <div data-hero-content className="wrap relative flex min-h-[100svh] flex-col justify-end pt-36 pb-8 md:pb-10">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          {/* Left: heading + CTA */}
          <div className="pt-[38vh] md:pt-[34svh] lg:pt-0">
            <Heading
              as="h1"
              id="hero-title"
              text={t.hero.title}
              accent={t.hero.titleAccent}
              tone="onDark"
              onLoad
              className="display-xl max-w-[12ch]"
            />
            <p data-in data-reveal data-lead className="mt-7 max-w-[46ch] text-lg text-cream/75">
              {t.hero.lead}
            </p>
            <div data-in data-reveal data-cta className="mt-8">
              <a href="#finder" className="pill-cta" aria-label={t.hero.cta}>
                <span className="pill-label">{t.hero.cta}</span>
                <span className="pill-circle" aria-hidden="true">
                  <ArrowRight className="size-5" />
                </span>
              </a>
            </div>
          </div>

          {/* Right: card stack */}
          <div data-in data-reveal className="hidden gap-3 [perspective:900px] md:grid md:grid-cols-3 lg:grid-cols-2">
            <Link
              data-card
              href={`/${locale}/catalog`}
              className="glass group flex h-16 items-center justify-between rounded-full px-6 text-lg transition-colors hover:bg-petrol-800/70 md:col-span-3 lg:col-span-2"
            >
              {t.cards.catalog}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a data-card href="#finder" className="glass group flex min-h-48 flex-col justify-between rounded-[22px] p-5 transition-transform duration-300 hover:-translate-y-1">
              <span className="mono-num inline-flex w-fit rounded-md border border-cream/20 px-2 py-1 text-xs text-glow">OEM</span>
              <span>
                <span className="block text-lg leading-tight">{t.cards.oemTitle}</span>
                <span className="mt-2 block text-sm text-cream/60">{t.cards.oemText}</span>
              </span>
            </a>
            <Link
              data-card
              href={`/${locale}/contact?topic=fitment`}
              className="glass group flex min-h-48 flex-col justify-between rounded-[22px] p-5 transition-transform duration-300 hover:-translate-y-1"
            >
              <ArrowRight className="size-5 -rotate-45 text-glow transition-transform duration-300 group-hover:rotate-0" />
              <span>
                <span className="block text-lg leading-tight">{t.cards.managerTitle}</span>
                <span className="mt-2 block text-sm text-cream/60">{t.cards.managerText}</span>
              </span>
            </Link>
            <div data-card className="glass hidden min-h-48 flex-col items-start justify-between gap-4 rounded-[22px] p-5 md:flex lg:col-span-2 lg:min-h-0 lg:flex-row lg:items-center lg:justify-start lg:gap-5">
              <span aria-hidden="true" className="ring-spin relative grid size-20 shrink-0 place-items-center rounded-full">
                <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--glow),var(--petrol-400),var(--cream),var(--glow))] opacity-90" />
                <span className="absolute inset-[7px] rounded-full bg-petrol-900" />
                <span className="relative font-brand text-sm font-extrabold tracking-wider text-cream">AI</span>
              </span>
              <span>
                <span className="flex items-center gap-2 text-lg">
                  {t.help.aiTitle}
                  <span className="rounded-full border border-cream/25 px-2 py-0.5 text-xs text-cream/70">{t.help.aiSoon}</span>
                </span>
                <span className="mt-1 block text-sm text-cream/60">{t.help.aiText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 01 / 02 / 03 */}
        <ol data-in data-reveal className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-8 lg:mt-14">
          {t.hero.points.map((p, i) => (
            <li key={p.title} data-point className="relative pt-4">
              <span data-point-rule aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-cream/25" />
              <span aria-hidden="true" className="absolute top-0 left-0 h-px w-1/3 bg-glow" />
              <span className="mono-num text-sm text-cream/55">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1 text-lg">{p.title}</p>
              <p className="text-sm text-cream/60">{p.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
