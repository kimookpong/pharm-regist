import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { Env, JwtPayload, Variables } from "../types";

/** ตรวจ JWT จาก Authorization: Bearer <token> และแนบ user เข้า context */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "ต้องเข้าสู่ระบบ" }, 401);
    }
    try {
      const payload = (await verify(header.slice(7), c.env.JWT_SECRET, "HS256")) as unknown as JwtPayload;
      c.set("user", payload);
      await next();
    } catch {
      return c.json({ error: "โทเคนไม่ถูกต้องหรือหมดอายุ" }, 401);
    }
  },
);

/** จำกัดเฉพาะบทบาทที่กำหนด (ใช้ต่อจาก requireAuth) */
export const requireRole = (...roles: Array<"admin" | "staff">) =>
  createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, 403);
    }
    await next();
  });
