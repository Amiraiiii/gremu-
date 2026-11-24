"use client";

import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/gsap";
import { Heading } from "@/components/motion/Heading";
import { ArrowRight } from "@/components/ui/icons";
import { PartIcon } from "./PartIcons";

/* ------------------------------------------------------------------ */
/* Giant statement: each line fills with cream as you scroll past it.  */
/* ------------------------------------------------------------------ */
export function Statement({ lines }: { lines: string[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          "[data-fill]",
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            ease: "none",
            stagger: 0.5,
            scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 55%", scrub: 0.6 },
          },
        );
        gsap.from("[data-line]", {
          xPercent: (i) => (i % 2 ? 8 : -8),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label={lines.join(" ")} className="relative overflow-hidden bg-petrol-950 py-20 md:py-32">
      <div className="wrap" aria-hidden="true">
        {lines.map((line, i) => (
          <div
            key={line}
            data-line
            className={`display-giant relative w-fit whitespace-nowrap ${i % 2 ? "ml-auto" : ""}`}
          >
            <span className="text-cream/10">{line}</span>
            <span
              data-fill
              className={`absolute inset-0 ${i === lines.length - 1 ? "text-grad-on-dark" : "text-cream"}`}
              style={{ clipPath: "inset(0 0 0 0)" }}
            >
              {line}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Journey: a meandering path drawn on scroll, steps light up in turn. */
/* ------------------------------------------------------------------ */
const STEP_ICONS = [
  // car
  <path key="a" d="M6 30h52v-6c0-3-2-4-5-5l-8-2-7-7c-2-2-4-2-6-2H22c-3 0-5 1-7 3l-6 6c-2 1-3 2-3 4zM14 32a5 5 0 1 0 10 0M40 32a5 5 0 1 0 10 0" />,
  // OEM / barcode
  <path key="b" d="M8 12v32M14 12v32M18 12v32M26 12v32M30 12v32M36 12v32M44 12v32M48 12v32M56 12v32" />,
  // shield check
  <path key="c" d="M32 6l20 8v14c0 12-9 20-20 24-11-4-20-12-20-24V14zM22 30l7 7 13-14" />,
  // chat
  <path key="d" d="M8 12h48v28H28l-12 10V40H8zM18 24h28M18 31h18" />,
];

export function Journey({ title, steps, lead }: { title: string; steps: string[]; lead: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.set("[data-path]", { strokeDasharray: 1, strokeDashoffset: 1 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: "[data-journey]", start: "top 70%", end: "bottom 60%", scrub: 0.8 },
        });
        tl.to("[data-path]", { strokeDashoffset: 0, ease: "none", duration: 1 }, 0);
        gsap.utils.toArray<HTMLElement>("[data-node]").forEach((n, i) => {
          tl.from(n, { scale: 0.6, opacity: 0, duration: 0.12, ease: "back.out(2)" }, 0.08 + i * 0.27);
        });
      });
      mm.add(MQ.desktop, () => {
        gsap.from("[data-title-run]", {
          xPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Meander through 4 columns (viewBox 1200 x 560)
  const d = "M150 520 L150 210 A150 150 0 0 1 450 210 L450 350 A150 150 0 0 0 750 350 L750 210 A150 150 0 0 1 1050 210 L1050 520";
  const nodes = [
    { x: 150, y: 380 },
    { x: 450, y: 300 },
    { x: 750, y: 260 },
    { x: 1050, y: 380 },
  ];

  return (
    <section ref={root} id="how-to" aria-labelledby="journey-title" className="bg-brand relative overflow-hidden pt-16 pb-20 text-cream md:pt-24 md:pb-28">
      <div className="overflow-hidden">
        <h2 id="journey-title" data-title-run className="display-giant wrap max-w-none">
          {title}
        </h2>
      </div>
      <div className="wrap">
        <p className="mt-10 max-w-[52ch] text-lg text-cream/75 md:mt-14">{lead}</p>

        {/* Desktop meander */}
        <div data-journey className="relative mt-10 hidden md:block">
          <svg viewBox="0 0 1200 560" className="h-auto w-full" fill="none" aria-hidden="true">
            <path d={d} stroke="oklch(100% 0 0 / 0.12)" strokeWidth="2" />
            <path data-path d={d} pathLength={1} stroke="url(#jg)" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="jg" x1="0" x2="1">
                <stop offset="0" stopColor="oklch(80% 0.08 198)" />
                <stop offset="1" stopColor="oklch(94% 0.022 85)" />
              </linearGradient>
            </defs>
          </svg>
          <ol>
            {steps.map((s, i) => (
              <li
                key={s}
                data-node
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center"
                style={{ left: `${(nodes[i].x / 1200) * 100}%`, top: `${(nodes[i].y / 560) * 100}%` }}
              >
                <span className="glass grid size-20 place-items-center rounded-full text-glow lg:size-24">
                  <svg viewBox="0 0 64 56" className="size-10 lg:size-12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {STEP_ICONS[i]}
                  </svg>
                </span>
                <span className="mono-num text-xs text-cream/55">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-xl font-medium tracking-[-0.02em] whitespace-nowrap">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Mobile list */}
        <ol className="mt-10 grid gap-3 md:hidden">
          {steps.map((s, i) => (
            <li key={s} className="glass flex items-center gap-4 rounded-2xl p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-petrol-900 text-glow">
                <svg viewBox="0 0 64 56" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {STEP_ICONS[i]}
                </svg>
              </span>
              <span className="mono-num text-xs text-cream/55">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-lg">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Floating CTA: centred question with part tiles drifting around it.  */
/* ------------------------------------------------------------------ */
const FLOATERS = [
  { slug: "brakes", x: "6%", y: "12%", r: -10, s: 1, speed: -30, hide: false },
  { slug: "filters", x: "16%", y: "58%", r: 8, s: 0.8, speed: -60, hide: true },
  { slug: "suspension", x: "4%", y: "82%", r: -6, s: 0.9, speed: -20, hide: true },
  { slug: "engine", x: "82%", y: "8%", r: 12, s: 0.9, speed: -50, hide: false },
  { slug: "electrics", x: "88%", y: "46%", r: -8, s: 1, speed: -25, hide: true },
  { slug: "cooling", x: "76%", y: "78%", r: 6, s: 0.85, speed: -70, hide: false },
  { slug: "transmission", x: "28%", y: "88%", r: -14, s: 0.7, speed: -40, hide: true },
  { slug: "consumables", x: "64%", y: "90%", r: 10, s: 0.75, speed: -35, hide: true },
];

export function FloatingCta({ title, accent, lead, cta, href }: { title: string; accent: string; lead: string; cta: string; href: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.utils.toArray<HTMLElement>("[data-float]").forEach((el) => {
          const speed = Number(el.dataset.speed);
          gsap.fromTo(
            el,
            { yPercent: -speed },
            {
              yPercent: speed,
              rotate: `+=${speed / 3}`,
              ease: "none",
              scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
          gsap.to(el.firstElementChild, { y: 10, duration: 2.6 + Math.abs(speed) / 40, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="float-title" className="relative overflow-hidden bg-paper py-28 md:py-44">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {FLOATERS.map((f, i) => (
          <div
            key={f.slug}
            data-float
            data-speed={f.speed}
            className={`absolute ${f.hide ? "hidden md:block" : ""}`}
            style={{ left: f.x, top: f.y, rotate: `${f.r}deg`, scale: f.s }}
          >
            <div
              className="grid size-28 place-items-center rounded-[22px] text-cream shadow-[0_24px_40px_-20px_oklch(20%_0.03_222/0.6)] md:size-36"
              style={{ background: `linear-gradient(140deg, oklch(${48 + (i % 3) * 7}% 0.07 ${200 + i * 4}), oklch(26% 0.05 222))` }}
            >
              <PartIcon slug={f.slug} className="size-16 md:size-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="wrap relative flex flex-col items-center text-center">
        <Heading id="float-title" text={title} accent={accent} tone="onLight" className="display-lg max-w-[16ch] text-petrol-900" />
        <p className="mt-6 max-w-[46ch] text-lg text-ink-2">{lead}</p>
        <a href={href} className="pill-cta on-light mt-10">
          <span className="pill-label">{cta}</span>
          <span className="pill-circle" aria-hidden="true">
            <ArrowRight className="size-5" />
          </span>
        </a>
      </div>
    </section>
  );
}
