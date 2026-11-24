/** Line drawings of parts, one per catalog category (decorative). */
const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 120 120",
  "aria-hidden": true,
};

export function PartIcon({ slug, className = "" }: { slug: string; className?: string }) {
  switch (slug) {
    case "filters":
      return (
        <svg {...common} className={className}>
          <ellipse cx="60" cy="28" rx="30" ry="9" />
          <path d="M30 28v58c0 5 13.4 9 30 9s30-4 30-9V28" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${36 + i * 6} 40v44`} opacity="0.6" />
          ))}
          <ellipse cx="60" cy="28" rx="10" ry="3" />
        </svg>
      );
    case "brakes":
      return (
        <svg {...common} className={className}>
          <circle cx="60" cy="60" r="42" />
          <circle cx="60" cy="60" r="16" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <circle key={i} cx={60 + Math.cos(a) * 26} cy={60 + Math.sin(a) * 26} r="3" />;
          })}
          <path d="M84 22c12 8 19 20 20 34l-12 1c-1-10-6-19-14-25z" />
        </svg>
      );
    case "suspension":
      return (
        <svg {...common} className={className}>
          <path d="M52 12h16M60 12v14M48 26h24v54H48z" />
          <path d="M60 80v26M50 106h20" />
          <path d="M40 34c40 4 40 10 0 14s40 10 0 14 40 10 0 14" opacity="0.7" />
        </svg>
      );
    case "engine":
      return (
        <svg {...common} className={className}>
          <path d="M36 22h48v34H36z" />
          <path d="M36 32h48M36 42h48" opacity="0.6" />
          <path d="M50 56l-4 22M70 56l4 22" />
          <circle cx="60" cy="88" r="14" />
          <circle cx="60" cy="88" r="4" />
        </svg>
      );
    case "body":
      return (
        <svg {...common} className={className}>
          <path d="M10 74h100v-12c0-5-4-8-9-9l-16-3-14-14c-3-3-7-4-11-4H39c-5 0-9 2-12 5L16 50c-4 1-6 4-6 8z" />
          <path d="M34 49l10-11h16v11zM66 38h6l10 11H66z" opacity="0.7" />
          <circle cx="32" cy="76" r="10" />
          <circle cx="88" cy="76" r="10" />
        </svg>
      );
    case "electrics":
      return (
        <svg {...common} className={className}>
          <path d="M54 10h12v14H54zM50 24h20v12H50z" />
          <path d="M52 36h16l-2 34H54z" />
          <path d="M46 70h28v10H46zM56 80v20M56 100h10" />
          <path d="M84 30l-8 14h10l-8 14" opacity="0.7" />
        </svg>
      );
    case "cooling":
      return (
        <svg {...common} className={className}>
          <rect x="16" y="26" width="88" height="68" rx="4" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M${24 + i * 8} 32v56`} opacity="0.55" />
          ))}
          <path d="M104 40h8M8 80h8" />
        </svg>
      );
    case "transmission":
      return (
        <svg {...common} className={className}>
          <path d="M60 22l6 1 2 8 7 3 7-5 8 8-5 7 3 7 8 2v12l-8 2-3 7 5 7-8 8-7-5-7 3-2 8H54l-2-8-7-3-7 5-8-8 5-7-3-7-8-2V54l8-2 3-7-5-7 8-8 7 5 7-3 2-8z" />
          <circle cx="60" cy="60" r="12" />
        </svg>
      );
    case "consumables":
      return (
        <svg {...common} className={className}>
          <path d="M36 40h40l12 12v50H36z" />
          <path d="M56 26h12v14H56zM76 40l14-10 8 4" />
          <path d="M48 66h28M48 78h20" opacity="0.6" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className}>
          <path d="M24 20h72l-6 80H30z" />
          <path d="M34 34h52M36 50h48M38 66h44M40 82h40" opacity="0.55" />
        </svg>
      );
  }
}
