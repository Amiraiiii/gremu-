"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/gsap";

type Props = {
  as?: "h1" | "h2";
  id?: string;
  /** Inline mode: one running line of text. */
  text?: string;
  /** Exact substring of `text` set in the brand gradient with the logo swoosh under it. */
  accent?: string;
  /** Stacked mode: giant uppercase lines, one per row (editorial poster heading). */
  lines?: string[];
  /** Indexes of `lines` set in the brand gradient. */
  accentLines?: number[];
  tone?: "onDark" | "onLight";
  /** Play on page load (hero) instead of when scrolled into view. */
  onLoad?: boolean;
  className?: string;
};

/**
 * Expressive heading. Words rise out of a mask, accent words get the brand gradient with a sweep
 * of light; in inline mode the logo swoosh draws under the accent. Plays once.
 */
export function Heading({
  as: Tag = "h2",
  id,
  text = "",
  accent,
  lines,
  accentLines = [],
  tone = "onLight",
  onLoad = false,
  className = "",
}: Props) {
  const root = useRef<HTMLHeadingElement>(null);
  const grad = tone === "onDark" ? "text-grad-on-dark" : "text-grad-on-light";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // pathLength=1 keeps dash maths right with non-scaling-stroke.
        const swoosh = root.current?.querySelector<SVGPathElement>("[data-swoosh]");
        if (swoosh) gsap.set(swoosh, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(root.current, { visibility: "visible" });

        const tl = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: onLoad ? undefined : { trigger: root.current, start: "top 85%", once: true },
          delay: onLoad ? 0.1 : 0,
        });
        tl.from("[data-w]", { yPercent: 115, rotate: 3, duration: 1.05, stagger: 0.07, transformOrigin: "0% 100%" });
        if (root.current?.querySelector("[data-accent-word]")) {
          tl.fromTo(
            "[data-accent-word]",
            { backgroundPosition: "100% 50%" },
            { backgroundPosition: "0% 50%", duration: 1.6, ease: "power2.inOut", stagger: 0.05 },
            "-=0.7",
          );
        }
        if (swoosh) tl.to(swoosh, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, "-=1.3");
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const word = (w: string, key: string, isAccent: boolean) => (
    <span key={key} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <span data-w {...(isAccent ? { "data-accent-word": "" } : {})} className={`inline-block ${isAccent ? grad : ""}`}>
        {w}
      </span>
    </span>
  );

  const words = (s: string, isAccent: boolean): ReactNode[] =>
    s
      .split(" ")
      .filter(Boolean)
      .map((w, i, arr) => (
        <span key={`${w}-${i}`}>
          {word(w, `${w}-${i}-w`, isAccent)}
          {i < arr.length - 1 ? " " : null}
        </span>
      ));

  // Stacked poster heading
  if (lines?.length) {
    return (
      <Tag ref={root} id={id} data-reveal className={`uppercase ${className}`}>
        {lines.map((line, i) => (
          <span key={line} className="block">
            {/* One mask per line keeps each row moving as a slab. */}
            {word(line, `l-${i}`, accentLines.includes(i))}
          </span>
        ))}
      </Tag>
    );
  }

  let content: ReactNode;
  const at = accent ? text.indexOf(accent) : -1;
  if (accent && at >= 0) {
    const before = text.slice(0, at).trim();
    const after = text.slice(at + accent.length).trim();
    content = (
      <>
        {before && <>{words(before, false)} </>}
        {/* The swoosh needs the phrase on one line, so it shows from lg up; smaller screens keep the gradient only. */}
        <span className="relative inline lg:inline-block lg:whitespace-nowrap">
          {words(accent, true)}
          <svg
            aria-hidden="true"
            viewBox="0 0 300 24"
            preserveAspectRatio="none"
            className={`pointer-events-none absolute -bottom-[0.12em] left-0 hidden h-[0.28em] w-full overflow-visible lg:block ${
              tone === "onDark" ? "text-glow" : "text-petrol-400"
            }`}
            fill="none"
          >
            <path
              data-swoosh
              pathLength={1}
              d="M2 20 C 80 2, 200 0, 298 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>
        {after && <> {words(after, false)}</>}
      </>
    );
  } else {
    content = words(text, false);
  }

  return (
    <Tag ref={root} id={id} data-reveal className={className}>
      {content}
    </Tag>
  );
}
