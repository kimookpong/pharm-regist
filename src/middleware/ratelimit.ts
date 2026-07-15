import { createMiddleware } from "hono/factory";
import type { Env, Variables } from "../types";

// Rate limiter แบบ in-memory (ต่อ isolate) — ไม่กินโควตา KV write ของ free tier
// เป็น best-effort กันสแปม/brute-force พื้นฐาน (ไม่ใช่ distributed rate limit)
// หากต้องการเข้ม ให้เปิด Cloudflare WAF Rate Limiting rules ที่หน้า dashboard

const buckets = new Map<string, { count: number; reset: number }>();

// ล้าง entry ที่หมดอายุเป็นระยะ กัน memory โต
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}

export function rateLimit(opts: { name: string; limit: number; windowMs: number }) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const now = Date.now();
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
    const key = `${opts.name}:${ip}`;
    const b = buckets.get(key);

    if (!b || b.reset < now) {
      buckets.set(key, { count: 1, reset: now + opts.windowMs });
    } else if (b.count >= opts.limit) {
      const retry = Math.ceil((b.reset - now) / 1000);
      c.header("Retry-After", String(retry));
      return c.json({ error: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้ง" }, 429);
    } else {
      b.count++;
    }
    sweep(now);
    await next();
  });
}
