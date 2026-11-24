"use client";

/** Guest cart kept in the browser: only product ids and quantities, never prices. */
export type CartItem = { id: string; qty: number };

const KEY = "gremu-cart-v1";
export const CART_EVENT = "gremu:cart";

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is CartItem => typeof r?.id === "string" && Number.isInteger(r?.qty))
      .map((r) => ({ id: r.id, qty: Math.min(Math.max(r.qty, 1), 99) }));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode): cart lives for this page only */
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function addToCart(id: string, qty = 1) {
  const cart = readCart();
  const row = cart.find((r) => r.id === id);
  if (row) row.qty = Math.min(row.qty + qty, 99);
  else cart.push({ id, qty });
  writeCart(cart);
}

export function setQty(id: string, qty: number) {
  writeCart(readCart().map((r) => (r.id === id ? { ...r, qty: Math.min(Math.max(qty, 1), 99) } : r)));
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter((r) => r.id !== id));
}

export function cartCount(): number {
  return readCart().reduce((s, r) => s + r.qty, 0);
}
