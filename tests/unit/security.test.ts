import { afterEach, describe, expect, it } from "vitest";
import { beginFlow, readFlow, safeNext, stateMatches } from "@/lib/auth/google";
import { roleForEmail } from "@/lib/auth/admin";
import { rateLimit } from "@/lib/rate-limit";
import { payme } from "@/features/payments/payme/config";
import { availablePaymentMethods, isPayable } from "@/features/payments";

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.STAFF_EMAILS;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.PAYME_MERCHANT_ID;
  delete process.env.PAYME_SECRET_KEY;
});

describe("post-login redirect (open-redirect guard)", () => {
  it("allows only same-site relative paths", () => {
    expect(safeNext("/ru/account/orders", "ru")).toBe("/ru/account/orders");
    for (const bad of ["//evil.example", "https://evil.example", "\\\\evil", "/\\evil", "", null]) {
      expect(safeNext(bad, "ru")).toBe("/ru/account");
    }
  });
});

describe("OAuth flow cookie", () => {
  it("round-trips and rejects tampering", () => {
    process.env.GOOGLE_CLIENT_ID = "test-client";
    const { url, cookie } = beginFlow("ru", "/ru/account");
    const u = new URL(url);
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    const flow = readFlow(cookie)!;
    expect(flow).not.toBeNull();
    expect(stateMatches(flow, u.searchParams.get("state")!)).toBe(true);
    expect(stateMatches(flow, "other-state")).toBe(false);
    const [payload, sig] = cookie.split(".");
    const forged = Buffer.from(JSON.stringify({ ...flow, next: "/x" })).toString("base64url");
    expect(readFlow(`${forged}.${sig}`)).toBeNull();
    expect(readFlow(`${payload}.AAAA`)).toBeNull();
  });
});

describe("staff roles come only from the server environment", () => {
  it("maps emails case-insensitively; everyone else is a customer", () => {
    process.env.ADMIN_EMAILS = "Owner@Shop.uz, second@shop.uz";
    process.env.STAFF_EMAILS = "clerk@shop.uz";
    expect(roleForEmail("owner@shop.uz")).toBe("admin");
    expect(roleForEmail("clerk@SHOP.uz")).toBe("staff");
    expect(roleForEmail("random@gmail.com")).toBeNull();
    expect(roleForEmail(null)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    const results = Array.from({ length: 4 }, () => rateLimit(key, 3, 60_000).ok);
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("payments", () => {
  it("offers Payme only when configured", () => {
    expect(availablePaymentMethods()).toEqual(["after_confirmation"]);
    process.env.PAYME_MERCHANT_ID = "m";
    process.env.PAYME_SECRET_KEY = "k";
    expect(availablePaymentMethods()).toContain("payme");
  });

  it("builds the hosted checkout URL with the server amount", () => {
    process.env.PAYME_MERCHANT_ID = "merchant-1";
    process.env.PAYME_SECRET_KEY = "k";
    const { redirectUrl } = payme.createCheckout({ orderNumber: "GR-261121-ABCD", amountMinor: 6_500_000, locale: "uz", returnUrl: "http://x/uz/order/GR-261121-ABCD" });
    expect(redirectUrl.startsWith("https://test.paycom.uz/")).toBe(true);
    const decoded = Buffer.from(redirectUrl.split("/").pop()!, "base64").toString();
    expect(decoded).toBe("m=merchant-1;ac.order_id=GR-261121-ABCD;a=6500000;l=uz;c=http://x/uz/order/GR-261121-ABCD");
  });

  it("paid, refunded and cancelled orders are not payable", () => {
    process.env.PAYME_MERCHANT_ID = "m";
    process.env.PAYME_SECRET_KEY = "k";
    const base = { status: "new", paymentMethod: "payme", paymentStatus: "unpaid" };
    expect(isPayable(base)).toBe(true);
    expect(isPayable({ ...base, paymentStatus: "paid" })).toBe(false);
    expect(isPayable({ ...base, paymentStatus: "refunded" })).toBe(false);
    expect(isPayable({ ...base, status: "cancelled" })).toBe(false);
    expect(isPayable({ ...base, paymentMethod: "after_confirmation" })).toBe(false);
  });
});
