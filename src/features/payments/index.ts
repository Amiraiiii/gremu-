import "server-only";
import { PAYMENT_METHODS } from "@/config/shop";
import { click } from "./click";
import { payme } from "./payme/config";
import type { PaymentProvider, ProviderCode } from "./types";

const providers: Record<ProviderCode, PaymentProvider> = { payme, click };

export function getProvider(code: string): PaymentProvider | null {
  return code in providers ? providers[code as ProviderCode] : null;
}

/** Payment method codes the checkout may offer right now: offline ones always, online ones only when configured. */
export function availablePaymentMethods(): string[] {
  return PAYMENT_METHODS.filter((m) => !m.provider || getProvider(m.provider)?.isConfigured()).map((m) => m.code);
}

/** Order states in which the customer may (re)open the hosted checkout. */
export function isPayable(order: { status: string; paymentMethod: string; paymentStatus: string }): boolean {
  const method = PAYMENT_METHODS.find((m) => m.code === order.paymentMethod);
  if (!method?.provider || !getProvider(method.provider)?.isConfigured()) return false;
  if (order.status === "cancelled") return false;
  return ["unpaid", "pending", "failed", "cancelled"].includes(order.paymentStatus);
}
