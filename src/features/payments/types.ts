/**
 * One interface for every payment provider. Adapters build the hosted-checkout redirect;
 * the payment result arrives only through the provider's server-to-server callback, which
 * each adapter verifies itself. A redirect back to the site never marks an order as paid.
 */
export type ProviderCode = "payme" | "click";

export type CheckoutRequest = {
  orderNumber: string;
  amountMinor: number; // tiyin
  locale: "ru" | "uz";
  returnUrl: string;
};

export interface PaymentProvider {
  code: ProviderCode;
  /** True only when credentials are set AND the adapter is implemented and tested. */
  isConfigured(): boolean;
  mode(): "test" | "production";
  createCheckout(req: CheckoutRequest): { redirectUrl: string };
}

/** Order payment statuses. `paid`/`refunded` are set only by a verified provider callback. */
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "cancelled", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
