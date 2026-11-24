"use client";

import { useState } from "react";

export function CopyLink({ label, done }: { label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked — the address bar still has the link */
        }
      }}
      className="inline-flex h-12 items-center rounded-full px-5 text-sm text-cream ring-1 ring-cream/30 transition-colors hover:bg-white/8"
      aria-live="polite"
    >
      {copied ? done : label}
    </button>
  );
}
