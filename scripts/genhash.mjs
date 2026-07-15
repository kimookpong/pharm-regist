// สร้าง PBKDF2 hash สำหรับ password (รูปแบบเดียวกับ src/lib/auth.ts)
// ใช้: node scripts/genhash.mjs 'รหัสผ่านใหม่'
import { webcrypto as crypto } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("ใช้: node scripts/genhash.mjs '<password>'");
  process.exit(1);
}
const ITER = 100000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
console.log(`pbkdf2$${ITER}$${hex(salt.buffer)}$${hex(bits)}`);
