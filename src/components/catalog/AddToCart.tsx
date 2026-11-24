"use client";

import { useState } from "react";
import { CartIcon } from "@/components/ui/icons";
import { addToCart } from "@/features/cart/client";

type State = "idle" | "loading" | "success" | "error";

/**
 * Stores the product id + quantity locally. Prices are never stored or trusted from the
 * client — the server recalculates the order at checkout (stage 5).
 */
export function AddToCart({
  productId,
  disabled,
  labels,
  size = "md",
}: {
  productId: string;
  disabled?: boolean;
  labels: { add: string; added: string };
  size?: "md" | "lg";
}) {
  const [state, setState] = useState<State>("idle");

  const add = () => {
    setState("loading");
    try {
      addToCart(productId);
      setState("success");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  };

  const base =
    size === "lg"
      ? "h-14 px-7 text-base"
      : "h-11 px-4 text-sm";

  return (
    <button
      type="button"
      onClick={add}
      disabled={disabled || state === "loading"}
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[transform,background-color] duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${base} ${
        state === "success" ? "bg-ok text-white" : state === "error" ? "bg-bad text-white" : "bg-petrol-900 text-cream hover:bg-petrol-700"
      }`}
    >
      {state === "success" ? (
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <CartIcon className="size-4" />
      )}
      {state === "success" ? labels.added : labels.add}
    </button>
  );
}
