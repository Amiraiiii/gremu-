import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";

// A fake request cookie jar for next/headers, and redirect() that throws like Next's does.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
    has: (k: string) => jar.has(k),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { getAdminSession, requireAdmin, staffFor } = await import("@/lib/auth/admin");
const { createUserSession, getCurrentUser, requireUser, upsertUser } = await import("@/lib/auth/user");
const { getUserOrder } = await import("@/features/account/service");
const { createOrder } = await import("@/features/orders/service");

function adminCookie(payload: object, secret = process.env.APP_SECRET!) {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${p}.${createHmac("sha256", secret).update(`admin:${p}`).digest("base64url")}`;
}

async function signIn(providerId: string, email: string) {
  const user = await upsertUser({ providerId, email, name: "T", locale: "ru" });
  jar.clear();
  await createUserSession(user.id);
  return user;
}

beforeEach(() => jar.clear());
afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.STAFF_EMAILS;
});

describe("admin area guards", () => {
  it("no session → redirected to sign-in", async () => {
    expect(await getAdminSession()).toBeNull();
    await expect(requireAdmin("ru")).rejects.toThrow("REDIRECT:/ru/admin/login");
  });

  it("password session must be correctly signed and unexpired", async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    jar.set("gremu_admin", adminCookie({ sub: "owner", role: "admin", exp }, "wrong-secret"));
    expect(await getAdminSession()).toBeNull();
    jar.set("gremu_admin", adminCookie({ sub: "owner", role: "admin", exp: 1 }));
    expect(await getAdminSession()).toBeNull();
    jar.set("gremu_admin", adminCookie({ sub: "owner", role: "admin", exp }));
    expect(await getAdminSession()).toMatchObject({ sub: "owner", role: "admin" });
  });

  it("a signed-in customer has no admin access", async () => {
    await signIn(`google:${randomUUID()}`, "customer@example.com");
    expect(await getAdminSession()).toBeNull();
  });

  it("Google staff get the role from the server lists; staff cannot use admin-only actions", async () => {
    await signIn(`google:${randomUUID()}`, "clerk@shop.example");
    process.env.STAFF_EMAILS = "clerk@shop.example";
    expect(await getAdminSession()).toMatchObject({ role: "staff", via: "google" });
    expect(await staffFor("admin")).toBeNull();
    await expect(requireAdmin("ru", "admin")).rejects.toThrow("REDIRECT:/ru/admin?denied=1");
    delete process.env.STAFF_EMAILS; // removing the email revokes access immediately
    expect(await getAdminSession()).toBeNull();
  });

  it("local dev-mode accounts never get staff rights, even if listed", async () => {
    await signIn("dev:owner@shop.example", "owner@shop.example");
    process.env.ADMIN_EMAILS = "owner@shop.example";
    expect(await getAdminSession()).toBeNull();
  });
});

describe("customer account guards", () => {
  it("account pages require a session; a forged cookie is not a session", async () => {
    await expect(requireUser("ru", "/ru/account")).rejects.toThrow("REDIRECT:/ru/account/login?next=%2Fru%2Faccount");
    jar.set("gremu_session", "forged-token");
    expect(await getCurrentUser()).toBeNull();
  });

  it("a customer sees only their own orders", async () => {
    const owner = await signIn(`google:${randomUUID()}`, `owner-${randomUUID()}@example.com`);
    const other = await upsertUser({ providerId: `google:${randomUUID()}`, email: `other-${randomUUID()}@example.com`, name: "O", locale: "ru" });
    const res = await createOrder(
      {
        locale: "ru",
        name: "Owner",
        phone: "+998901112233",
        email: "",
        region: "tashkent_city",
        city: "Ташкент",
        address: "Тест 1",
        deliveryMethod: "agree_with_manager",
        paymentMethod: "after_confirmation",
        note: "",
        consent: true,
        items: [{ id: "demo-001", qty: 1 }],
        expectedTotalMinor: 6_500_000,
      },
      randomUUID(),
      owner.id,
    );
    if (!res.ok) throw new Error("order failed");
    expect(await getUserOrder(owner.id, res.orderNumber)).not.toBeNull();
    expect(await getUserOrder(other.id, res.orderNumber)).toBeNull();
  });
});
