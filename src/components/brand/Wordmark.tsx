/**
 * Text wordmark built from the gremu logo: bold geometric GREMU, light "auto parts",
 * and the logo's swoosh arc. Replace with the vector logo file once the client supplies it
 * (public/brand/gremu-logo.svg).
 */
export function Wordmark({ tone = "cream", className = "" }: { tone?: "cream" | "petrol"; className?: string }) {
  const color = tone === "cream" ? "text-cream" : "text-petrol-900";
  return (
    <span className={`relative inline-flex flex-col leading-none ${color} ${className}`} aria-label="gremu auto parts">
      <svg
        aria-hidden="true"
        viewBox="0 0 120 40"
        className="pointer-events-none absolute -top-2 -right-3 h-8 w-24 opacity-70"
        fill="none"
      >
        <path d="M4 34 C 30 4, 90 0, 116 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="font-brand text-[1.45rem] font-extrabold tracking-[0.06em]">GREMU</span>
      <span className="mt-0.5 self-end pr-0.5 font-brand text-[0.62rem] font-medium tracking-[0.18em] opacity-80">
        auto parts
      </span>
    </span>
  );
}
