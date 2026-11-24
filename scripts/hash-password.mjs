// Generates ADMIN_PASSWORD_HASH for .env.local.
// Usage: npm run admin:hash -- "your-long-password"
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Pass a password of at least 12 characters: npm run admin:hash -- \"...\"");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);
// "." separators: "$" would be expanded as a variable by the .env loader.
console.log(`ADMIN_PASSWORD_HASH=scrypt.${salt.toString("base64url")}.${hash.toString("base64url")}`);
