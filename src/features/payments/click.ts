import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Click adapter — INTERFACE ONLY, not an active integration.
 * It stays disabled (isConfigured() === false) even if CLICK_* variables are set, until the
 * Prepare/Complete callbacks with signature checks are implemented and tested against Click's
 * test environment with real merchant credentials. Checkout never offers it before that.
 */
export const click: PaymentProvider = {
  code: "click",
  isConfigured: () => false,
  mode: () => "test",
  createCheckout() {
    throw new Error("Click adapter is not implemented yet");
  },
};
