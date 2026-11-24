import "server-only";
import type { PaymentProvider } from "../types";

/**
 * Payme (Paycom) configuration. All values are server-only environment variables.
 *  PAYME_MERCHANT_ID — merchant (cashbox) id from the Payme business cabinet
 *  PAYME_SECRET_KEY  — the cabinet key: the TEST key while PAYME_MODE=test, the production key after onboarding
 *  PAYME_MODE        — "test" (default) or "production"
 *  PAYME_CHECKOUT_URL — optional override of the hosted checkout base URL
 */
export const PAYME_ACCOUNT_FIELD = "order_id"; // must match the account field configured in the cabinet

export function paymeMode(): "test" | "production" {
  return process.env.PAYME_MODE?.trim() === "production" ? "production" : "test";
}

export function paymeKey(): string | null {
  return process.env.PAYME_SECRET_KEY?.trim() || null;
}

function merchantId(): string | null {
  return process.env.PAYME_MERCHANT_ID?.trim() || null;
}

function checkoutBase(): string {
  const override = process.env.PAYME_CHECKOUT_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return paymeMode() === "production" ? "https://checkout.paycom.uz" : "https://test.paycom.uz";
}

export const payme: PaymentProvider = {
  code: "payme",
  isConfigured: () => Boolean(merchantId() && paymeKey()),
  mode: paymeMode,
  /** Hosted checkout via GET: base64("m=<merchant>;ac.order_id=<number>;a=<tiyin>;l=<lang>;c=<return url>"). */
  createCheckout({ orderNumber, amountMinor, locale, returnUrl }) {
    const mid = merchantId();
    if (!mid) throw new Error("PAYME_MERCHANT_ID is not set");
    if (/[;]/.test(returnUrl)) throw new Error("return URL must not contain ';'");
    const params = [`m=${mid}`, `ac.${PAYME_ACCOUNT_FIELD}=${orderNumber}`, `a=${amountMinor}`, `l=${locale}`, `c=${returnUrl}`].join(";");
    return { redirectUrl: `${checkoutBase()}/${Buffer.from(params, "utf8").toString("base64")}` };
  },
};
