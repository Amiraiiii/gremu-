"use client";

import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/gsap";

/** A thin vertical rule that fills as its parent list scrolls through the viewport. */
export function ScrollLine({ className = "" }: { className?: string }) {
  const line = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      const parent = line.current?.parentElement;
      if (!parent) return;
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: parent, start: "top 70%", end: "bottom 60%", scrub: 0.4 },
        },
      );
    });
    return () => mm.revert();
  });

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute w-px bg-white/12 ${className}`}>
      <span ref={line} className="block h-full w-full origin-top bg-cream" />
    </span>
  );
}
