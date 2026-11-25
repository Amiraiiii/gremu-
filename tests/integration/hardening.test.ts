import { describe, expect, it, vi } from "vitest";
import { randomBytes, scryptSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { limit, peek, reset } from "@/lib/rate-limit";
import { checkLoginAllowed, LOGIN_POLICY, recordLoginFailure, recordLoginSuccess } from "@/lib/auth/login-guard";
import { verifyPassword } from "@/lib/auth/admin";
import { rejectNonJson } from "@/lib/http";

const uid = () => randomBytes(6).toString("hex");

describe("shared (database) rate limiter", () => {
  it("counts hits in the DB and resets", async () => {
    const key = `t:${uid()}`;
    for (let i = 1; i <= 3; i++) expect((await limit(key, 3, 60_000)).ok).toBe(true);
    const over = await limit(key, 3, 60_000);
    expect(over.ok).toBe(false);
    expect(over.retryAfter).toBeGreaterThan(0);
    expect(await peek(key, 60_000)).toBeGreaterThanOrEqual(3);
    await reset(key);
    expect(await peek(key, 60_000)).toBe(0);
    expect((await limit(key, 3, 60_000)).ok).toBe(true);
  });

  it("starts a new window after it expires", async () => {
    const key = `t:${uid()}`;
    await limit(key, 100, 300);
    await limit(key, 100, 300);
    expect(await peek(key, 300)).toBe(2);
    await new Promise((r) => setTimeout(r, 400));
    expect(await peek(key, 300)).toBe(0);
    expect((await limit(key, 100, 300)).count).toBe(1);
  });
});

describe("admin login brute-force guard", () => {
  it(`blocks an IP after ${LOGIN_POLICY.ip.max} attempts`, async () => {
    const ip = `10.0.0.${uid()}`;
    for (let i = 0; i < LOGIN_POLICY.ip.max; i++) expect((await checkLoginAllowed(ip, `u-${uid()}`)).ok).toBe(true);
    expect((await checkLoginAllowed(ip, `u-${uid()}`)).ok).toBe(false);
  });

  it(`locks a username after ${LOGIN_POLICY.user.max} failures from different IPs, success resets it`, async () => {
    const user = `owner-${uid()}`;
    for (let i = 0; i < LOGIN_POLICY.user.max; i++) {
      expect((await checkLoginAllowed(`ip-${uid()}`, user)).ok).toBe(true);
      await recordLoginFailure(user);
    }
    expect((await checkLoginAllowed(`ip-${uid()}`, user)).ok).toBe(false);
    expect((await checkLoginAllowed(`ip-${uid()}`, user.toUpperCase())).ok).toBe(false); // case-insensitive
    await recordLoginSuccess(user);
    expect((await checkLoginAllowed(`ip-${uid()}`, user)).ok).toBe(true);
  }, 30_000);
});

describe("password hashing", () => {
  const make = (scheme: string, N: number, pw: string) => {
    const salt = randomBytes(16);
    const hash = scryptSync(pw, salt, 32, { N, r: 8, p: 1, maxmem: 256 * N * 8 });
    return `${scheme}.${salt.toString("base64url")}.${hash.toString("base64url")}`;
  };

  it("verifies legacy and OWASP-cost hashes, rejects wrong passwords and unknown schemes", () => {
    const legacy = make("scrypt", 2 ** 14, "Correct-Horse-1!");
    const strong = make("scrypt17", 2 ** 17, "Correct-Horse-1!");
    expect(verifyPassword("Correct-Horse-1!", legacy)).toBe(true);
    expect(verifyPassword("Correct-Horse-1!", strong)).toBe(true);
    expect(verifyPassword("correct-horse-1!", strong)).toBe(false);
    expect(verifyPassword("Correct-Horse-1!", strong.replace("scrypt17", "md5"))).toBe(false);
  });

  it("the hash script refuses weak passwords and emits scrypt17", () => {
    const run = (pw: string) => {
      try {
        return execFileSync(process.execPath, ["scripts/hash-password.mjs", pw], { encoding: "utf8", stdio: "pipe" });
      } catch (e) {
        return `ERR ${(e as { stderr?: string }).stderr ?? ""}`;
      }
    };
    expect(run("short1!")).toMatch(/^ERR/);
    expect(run("adminadminadmin123")).toMatch(/^ERR/);
    const out = run("Tq7#vLm2-Rx9!pWz4");
    expect(out).toMatch(/^ADMIN_PASSWORD_HASH=scrypt17\./);
    expect(verifyPassword("Tq7#vLm2-Rx9!pWz4", out.trim().split("=")[1])).toBe(true);
  }, 30_000);
});

describe("cookies and request guards", () => {
  it("uses __Host-/__Secure- cookie names in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const names = await import("@/lib/auth/cookie-names");
    expect(names.USER_COOKIE).toBe("__Host-gremu_session");
    expect(names.ADMIN_COOKIE).toBe("__Host-gremu_admin");
    expect(names.OAUTH_COOKIE).toBe("__Secure-gremu_oauth");
    vi.unstubAllEnvs();
  });

  it("JSON APIs refuse form/text bodies and foreign origins (CSRF)", () => {
    const req = (type: string, origin?: string) =>
      new Request("http://shop.test/api/x", { method: "POST", headers: { "content-type": type, host: "shop.test", ...(origin ? { origin } : {}) } });
    expect(rejectNonJson(req("text/plain"))?.status).toBe(415);
    expect(rejectNonJson(req("application/x-www-form-urlencoded"))?.status).toBe(415);
    expect(rejectNonJson(req("application/json", "https://evil.example"))?.status).toBe(403);
    expect(rejectNonJson(req("application/json", "http://shop.test"))).toBeNull();
  });

  it("serves security.txt with a contact and an expiry", async () => {
    const { GET } = await import("@/app/.well-known/security.txt/route");
    const text = await GET().text();
    expect(text).toMatch(/^Contact: /m);
    expect(text).toMatch(/^Expires: \d{4}-/m);
  });
});
