import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { Env, Variables } from "../types";
import { loginSchema } from "../lib/validate";
import { verifyPassword } from "../lib/auth";
import { rateLimit } from "../middleware/ratelimit";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/auth/login — จำกัด 10 ครั้ง/นาที/IP กัน brute-force
app.post("/login", rateLimit({ name: "login", limit: 10, windowMs: 60_000 }), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "ข้อมูลไม่ครบ" }, 400);

  const { username, password } = parsed.data;
  const user = await c.env.DB.prepare(
    "SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?1",
  )
    .bind(username)
    .first<{ id: number; username: string; password_hash: string; role: string; is_active: number }>();

  // ตอบข้อความเดียวกันทั้งกรณีไม่มี user / รหัสผิด กัน user enumeration
  const ok = user && user.is_active === 1 && (await verifyPassword(password, user.password_hash));
  if (!user || !ok) {
    return c.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 ชั่วโมง
  const token = await sign({ sub: user.id, username: user.username, role: user.role, exp }, c.env.JWT_SECRET);

  return c.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

export default app;
