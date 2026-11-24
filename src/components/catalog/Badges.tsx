import type { Availability, FitmentStatus } from "@/features/catalog/types";

const AV_DOT: Record<Availability, string> = {
  in_stock: "bg-ok",
  low_stock: "bg-warn",
  out_of_stock: "bg-bad",
  on_request: "bg-petrol-400",
};

export function AvailabilityBadge({ value, label }: { value: Availability; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-ink-2">
      <span aria-hidden="true" className={`size-2 rounded-full ${AV_DOT[value]}`} />
      {label}
    </span>
  );
}

const FIT_STYLE: Record<FitmentStatus, string> = {
  verified: "bg-ok/12 text-ok ring-ok/30",
  unverified: "bg-warn/12 text-[oklch(45%_0.12_70)] ring-warn/35",
  not_compatible: "bg-bad/10 text-bad ring-bad/30",
};

export function FitmentBadge({ status, label }: { status: FitmentStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ${FIT_STYLE[status]}`}
    >
      {status === "verified" ? (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}

export function DemoBadge({ label }: { label: string }) {
  return (
    <span className="mono-num inline-flex items-center rounded-md bg-petrol-900/85 px-2 py-0.5 text-[0.7rem] tracking-wider text-cream uppercase">
      {label}
    </span>
  );
}
