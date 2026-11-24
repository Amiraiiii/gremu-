"use client";

import { useEffect, useRef } from "react";

/**
 * Whisper-level dust drifting down through the overhead light cone.
 * Runs only while on screen; does not run at all under reduced motion.
 */
export function DustCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Seeded so the field looks the same on every load
    let seed = 20231;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

    type P = { x: number; y: number; r: number; a: number; vy: number; sway: number; ph: number };
    let w = 0;
    let h = 0;
    let parts: P[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spawn = (anyY: boolean): P => {
      // Most dust lives inside the light cone around the centre
      const inCone = rnd() < 0.75;
      const x = inCone ? w * (0.5 + (rnd() - 0.5) * 0.42) : w * rnd();
      return {
        x,
        y: anyY ? h * rnd() : -10,
        r: 0.5 + rnd() * 1.7,
        a: (inCone ? 0.22 : 0.1) + rnd() * 0.35,
        vy: 6 + rnd() * 14,
        sway: 4 + rnd() * 10,
        ph: rnd() * Math.PI * 2,
      };
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (w * h) / 16000));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y += p.vy * dt;
        p.ph += dt * 0.6;
        if (p.y > h + 10) Object.assign(p, spawn(false));
        const x = p.x + Math.sin(p.ph) * p.sway;
        // Brighter inside the cone, fading toward the edges
        const cone = 1 - Math.min(1, Math.abs(x / w - 0.5) / 0.35);
        ctx.globalAlpha = p.a * (0.35 + 0.65 * cone);
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#f1e8d8";
        ctx.fill();
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);
    const onVis = () => {
      if (!document.hidden && visible) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
