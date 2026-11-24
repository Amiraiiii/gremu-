"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { Heading } from "@/components/motion/Heading";
import { ArrowRight } from "@/components/ui/icons";
import { DustCanvas } from "./DustCanvas";

/**
 * Cinematic scroll hero (10k-websites pattern, built from a still instead of a video file):
 * the approved Higgsfield frame sits in a sticky stage; scrolling "descends" the camera onto
 * the brake disc while caption bands take turns in the calm space on either side.
 * This gate must stay character-for-character identical to the media query in globals.css.
 */
export const CINE_SCRUB = "(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

type T = {
  hero: Dictionary["hero"];
  bands: Dictionary["heroBands"];
};

export function Hero({ t }: { t: T }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Load entrance (any screen): the frame and the opening copy settle in once.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set("[data-in]", { visibility: "visible" });
        gsap.from("[data-lead], [data-cta]", { y: 18, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.6, ease: "power3.out" });
        gsap.from("[data-cine-img]", { scale: 1.08, opacity: 0, duration: 1.6, ease: "power2.out" });
      });

      // Scroll-scrubbed journey on large screens.
      mm.add(CINE_SCRUB, () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: "[data-cine-track]", start: "top top", end: "bottom bottom", scrub: 0.7 },
        });
        // The camera descends onto the disc across the whole journey
        tl.fromTo("[data-cine-zoom]", { scale: 1, yPercent: 0 }, { scale: 1.55, yPercent: 3, duration: 1 }, 0)
          .to("[data-cue]", { opacity: 0, duration: 0.05 }, 0)
          // Band 1 (opening, already settled) leaves
          .to("[data-band='1']", { opacity: 0, y: -40, duration: 0.07, ease: "power1.in" }, 0.2)
          // Band 2, left
          .fromTo("[data-band='2']", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.06, ease: "power2.out" }, 0.27)
          .to("[data-band='2']", { opacity: 0, x: -30, duration: 0.05, ease: "power1.in" }, 0.47)
          // Band 3, right
          .fromTo("[data-band='3']", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.06, ease: "power2.out" }, 0.52)
          .to("[data-band='3']", { opacity: 0, x: 30, duration: 0.05, ease: "power1.in" }, 0.7)
          // The settle: the camera has arrived
          .fromTo("[data-band='4']", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, 0.76)
          .fromTo("[data-point]", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.06, stagger: 0.02, ease: "power2.out" }, 0.82)
          // Side scrims deepen only while their band speaks
          .fromTo("[data-scrim-l]", { opacity: 0.6 }, { opacity: 1, duration: 0.06 }, 0.27)
          .to("[data-scrim-l]", { opacity: 0.6, duration: 0.06 }, 0.47)
          .fromTo("[data-scrim-r]", { opacity: 0.55 }, { opacity: 1, duration: 0.06 }, 0.52)
          .to("[data-scrim-r]", { opacity: 0.55, duration: 0.06 }, 0.7);
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const bandTitle = "text-[clamp(2rem,3vw,2.9rem)] leading-[1.02] font-medium tracking-[-0.045em] text-shadow-cine";
  const bandText = "mt-4 max-w-[34ch] text-lg text-cream/80 text-shadow-cine";

  return (
    <section ref={root} className="cine relative bg-petrol-950 text-cream" aria-labelledby="hero-title">
      <div data-cine-track className="cine-track">
        <div className="cine-stage overflow-hidden">
          {/* The frame: AI-generated with Higgsfield for gremu */}
          <div data-cine-img className="absolute inset-0">
            <div data-cine-zoom className="absolute inset-0 origin-[50%_48%] will-change-transform">
              <picture>
                <source type="image/webp" media="(min-width: 1400px)" srcSet="/hero/brake-hero-2560.webp" />
                <source type="image/webp" srcSet="/hero/brake-hero-1280.webp" />
                <img
                  src="/hero/brake-hero-1920.jpg"
                  alt=""
                  aria-hidden="true"
                  fetchPriority="high"
                  className="h-full w-full object-cover object-[50%_45%]"
                />
              </picture>
            </div>
          </div>

          {/* Breathing light and dust in the cone */}
          <div aria-hidden="true" className="cine-light pointer-events-none absolute inset-0" />
          <DustCanvas className="pointer-events-none absolute inset-0 h-full w-full" />

          {/* Legibility: base vignette, side scrims, bottom fade */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_45%,transparent_35%,oklch(14%_0.025_222/0.7)_100%)]" />
          <div data-scrim-l aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[55%] bg-[linear-gradient(90deg,oklch(15%_0.028_222/0.85),oklch(15%_0.028_222/0.4)_55%,transparent)] opacity-60" />
          <div data-scrim-r aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[50%] bg-[linear-gradient(270deg,oklch(13%_0.028_222/0.95),oklch(14%_0.028_222/0.6)_55%,transparent)] opacity-55" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,oklch(15%_0.028_222/0.92),transparent)]" />

          <div className="wrap relative h-full">
            {/* Band 1: the opening, settled on load */}
            <div data-band="1" className="cine-band cine-band-1">
              <Heading
                as="h1"
                id="hero-title"
                text={t.hero.title}
                accent={t.hero.titleAccent}
                tone="onDark"
                onLoad
                className="display-xl max-w-[12ch] drop-cine"
              />
              <p data-in data-reveal data-lead className="mt-6 max-w-[46ch] text-lg text-cream/80 text-shadow-cine">
                {t.hero.lead}
              </p>
              <div data-in data-reveal data-cta className="mt-8">
                <a href="#finder" className="pill-cta">
                  <span className="pill-label">{t.hero.cta}</span>
                  <span className="pill-circle" aria-hidden="true">
                    <ArrowRight className="size-5" />
                  </span>
                </a>
              </div>
            </div>

            {/* Band 2: left */}
            <div data-band="2" className="cine-band cine-band-side cine-band-left">
              <p className="mono-num text-sm text-glow">01</p>
              <p className={`mt-3 max-w-[16ch] ${bandTitle}`}>{t.bands.fitTitle}</p>
              <p className={bandText}>{t.bands.fitText}</p>
            </div>

            {/* Band 3: right */}
            <div data-band="3" className="cine-band cine-band-side cine-band-right">
              <p className="mono-num text-sm text-glow">02</p>
              <p className={`mt-3 max-w-[16ch] ${bandTitle}`}>{t.bands.typeTitle}</p>
              <p className={bandText}>{t.bands.typeText}</p>
            </div>

            {/* Band 4: the settle */}
            <div data-band="4" className="cine-band cine-band-4">
              <p className={`max-w-[18ch] ${bandTitle}`}>{t.bands.settleTitle}</p>
              <p className={bandText}>{t.bands.settleText}</p>
              <div className="mt-7">
                <a href="#finder" className="pill-cta">
                  <span className="pill-label">{t.hero.cta}</span>
                  <span className="pill-circle" aria-hidden="true">
                    <ArrowRight className="size-5" />
                  </span>
                </a>
              </div>
              <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-8">
                {t.hero.points.map((p, i) => (
                  <li key={p.title} data-point className="relative border-t border-cream/25 pt-4">
                    <span className="mono-num text-sm text-cream/55">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-1 text-lg">{p.title}</p>
                    <p className="text-sm text-cream/65">{p.text}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Scroll cue (scrub mode only) */}
            <div data-cue aria-hidden="true" className="cine-cue absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.2em] text-cream/60 uppercase">
              {t.bands.scroll}
              <span className="block h-10 w-px overflow-hidden bg-cream/20">
                <span className="cine-cue-dot block h-1/2 w-full bg-cream/80" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
