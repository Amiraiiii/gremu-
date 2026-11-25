// Generates ADMIN_PASSWORD_HASH (scrypt, OWASP cost N=2^17, r=8, p=1).
// Usage: npm run admin:hash -- "a-long-unique-password"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2] ?? "";
const classes = [/[a-zа-яё]/, /[A-ZА-ЯЁ]/, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(password)).length;
const problems = [];
if (password.length < 16) problems.push("at least 16 characters");
if (password.length < 24 && classes < 3) problems.push("mix of lower/upper case, digits and symbols (or 24+ characters)");
if (/^(.)\1+$/.test(password) || /(password|qwerty|123456|admin|gremu)/i.test(password)) problems.push("no obvious words or repeats");
if (problems.length) {
  console.error(`Password too weak — needs: ${problems.join("; ")}.\nUsage: npm run admin:hash -- "..."`);
  process.exit(1);
}

const N = 2 ** 17;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N, r: 8, p: 1, maxmem: 256 * N * 8 });
// "." separators: "$" would be expanded as a variable by the .env loader.
console.log(`ADMIN_PASSWORD_HASH=scrypt17.${salt.toString("base64url")}.${hash.toString("base64url")}`);
