/** Hand-built technical drawing of a ventilated brake disc with caliper (decorative). */
export function BrakeDisc({ className = "" }: { className?: string }) {
  const bolts = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(a) * 44, y: 200 + Math.sin(a) * 44 };
  });
  const vents = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const r1 = 118;
    const r2 = 168;
    const skew = 0.12;
    return {
      x1: 200 + Math.cos(a) * r1,
      y1: 200 + Math.sin(a) * r1,
      x2: 200 + Math.cos(a + skew) * r2,
      y2: 200 + Math.sin(a + skew) * r2,
    };
  });
  const r = (n: number) => Math.round(n * 100) / 100;

  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden="true">
      <g data-disc stroke="currentColor" strokeLinecap="round">
        <circle data-draw cx="200" cy="200" r="182" strokeWidth="1.6" />
        <circle data-draw cx="200" cy="200" r="172" strokeWidth="0.8" opacity="0.6" />
        <circle data-draw cx="200" cy="200" r="112" strokeWidth="1.2" />
        <circle data-draw cx="200" cy="200" r="72" strokeWidth="1.4" />
        <circle data-draw cx="200" cy="200" r="24" strokeWidth="1.4" />
        {vents.map((v, i) => (
          <line
            key={i}
            data-draw
            x1={r(v.x1)}
            y1={r(v.y1)}
            x2={r(v.x2)}
            y2={r(v.y2)}
            strokeWidth="0.8"
            opacity="0.45"
          />
        ))}
        {bolts.map((b, i) => (
          <circle key={i} data-draw cx={r(b.x)} cy={r(b.y)} r="7" strokeWidth="1.2" />
        ))}
      </g>
      {/* Caliper */}
      <g data-caliper stroke="currentColor" strokeLinejoin="round">
        <path
          data-draw
          d="M300 70 C 352 100, 384 152, 388 212 L 352 214 C 348 166, 326 126, 288 100 Z"
          strokeWidth="1.6"
          fill="oklch(26% 0.035 222 / 0.55)"
        />
        <path data-draw d="M318 104 C 340 126, 354 152, 360 180" strokeWidth="1" opacity="0.7" />
        <circle data-draw cx="336" cy="124" r="6" strokeWidth="1.2" />
        <circle data-draw cx="368" cy="192" r="6" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
