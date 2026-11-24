"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { gsap, MQ, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { PartIcon } from "./PartIcons";

type Item = Dictionary["categories"]["items"][number];

// Ten grounds walked around the logo teal — different shades, one family.
const GROUNDS = [
  "linear-gradient(140deg, oklch(46% 0.07 214), oklch(28% 0.05 222))",
  "linear-gradient(140deg, oklch(56% 0.08 200), oklch(34% 0.06 212))",
  "linear-gradient(140deg, oklch(38% 0.05 226), oklch(22% 0.04 228))",
  "linear-gradient(140deg, oklch(62% 0.07 190), oklch(40% 0.06 205))",
  "linear-gradient(140deg, oklch(42% 0.06 236), oklch(24% 0.045 234))",
  "linear-gradient(140deg, oklch(50% 0.075 206), oklch(30% 0.05 218))",
  "linear-gradient(140deg, oklch(66% 0.06 196), oklch(44% 0.06 208))",
  "linear-gradient(140deg, oklch(34% 0.045 218), oklch(19% 0.03 224))",
  "linear-gradient(140deg, oklch(54% 0.06 222), oklch(32% 0.05 226))",
  "linear-gradient(140deg, oklch(60% 0.085 205), oklch(36% 0.06 214))",
];

/**
 * Looping strip of category tiles. Each tile tilts in 3D toward the pointer with its drawing
 * lifted off the surface. The strip drifts, speeds up with scroll and stops under the pointer.
 */
export function CategoryStrip({ locale, items }: { locale: Locale; items: Item[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const loop = gsap.fromTo("[data-track]", { xPercent: 0 }, { xPercent: -50, duration: 70, ease: "none", repeat: -1 });
        let hovered = false;
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
          onUpdate: (self) => {
            if (hovered) return;
            const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 6);
            gsap.to(loop, {
              timeScale: boost * self.direction,
              duration: 0.25,
              overwrite: true,
              onComplete: () => {
                if (!hovered) gsap.to(loop, { timeScale: 1, duration: 1.2, ease: "power2.out", overwrite: true });
              },
            });
          },
        });
        const el = root.current!;
        const stop = contextSafe!(() => {
          hovered = true;
          gsap.to(loop, { timeScale: 0, duration: 0.6, ease: "power2.out", overwrite: true });
        });
        const go = contextSafe!(() => {
          hovered = false;
          gsap.to(loop, { timeScale: 1, duration: 0.9, ease: "power2.in", overwrite: true });
        });
        el.addEventListener("pointerenter", stop);
        el.addEventListener("pointerleave", go);
        el.addEventListener("focusin", stop);
        el.addEventListener("focusout", go);
        return () => {
          st.kill();
          el.removeEventListener("pointerenter", stop);
          el.removeEventListener("pointerleave", go);
          el.removeEventListener("focusin", stop);
          el.removeEventListener("focusout", go);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--ry", `${(x * 18).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  const tile = (c: Item, i: number, copy: number) => (
    <li key={`${copy}-${c.slug}`} className="shrink-0 pr-4 [perspective:1000px]">
      <Link
        href={`/${locale}/categories/${c.slug}`}
        tabIndex={copy === 2 ? -1 : undefined}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ background: GROUNDS[i % GROUNDS.length] }}
        className="tilt-tile group relative flex h-[17rem] w-[19rem] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-cream sm:h-[19rem] sm:w-[26rem]"
      >
        <span aria-hidden="true" className="tilt-shine pointer-events-none absolute inset-0" />
        <span className="tilt-lift-sm mono-num relative text-sm text-cream/70">{String(i + 1).padStart(2, "0")}</span>
        <PartIcon
          slug={c.slug}
          className="tilt-lift pointer-events-none absolute top-1/2 right-6 size-36 text-cream/85 drop-shadow-[0_18px_24px_oklch(0%_0_0/0.35)] sm:size-44"
        />
        <span className="tilt-lift-sm relative max-w-[60%]">
          <span className="block text-[1.7rem] leading-[1.02] font-medium tracking-[-0.03em]">{c.name}</span>
          <span className="mt-2 block text-sm text-cream/70">{c.parts}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <div ref={root} className="strip-viewport overflow-hidden py-6">
      <div data-track className="flex w-max">
        <ul className="flex">{items.map((c, i) => tile(c, i, 1))}</ul>
        <ul data-copy="2" aria-hidden="true" className="flex">
          {items.map((c, i) => tile(c, i, 2))}
        </ul>
      </div>
    </div>
  );
}
