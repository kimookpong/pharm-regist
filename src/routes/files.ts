import { Hono } from "hono";
import type { Env, Variables } from "../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// GET /api/files/speakers/:name — serve รูปวิทยากรจาก R2 (public read)
// จำกัดเฉพาะ prefix "speakers/" กันไม่ให้ดึงไฟล์ประเภทอื่น (เช่น slips/*)
app.get("/speakers/:name", async (c) => {
  const name = c.req.param("name");
  // ป้องกัน path traversal — ต้องเป็นชื่อไฟล์เดี่ยว ไม่มี "/" หรือ ".."
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    return c.json({ error: "ชื่อไฟล์ไม่ถูกต้อง" }, 400);
  }
  const key = `speakers/${name}`;
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: "ไม่พบไฟล์" }, 404);

  const contentType = obj.httpMetadata?.contentType ?? "application/octet-stream";
  if (!IMAGE_TYPES.has(contentType)) {
    return c.json({ error: "ประเภทไฟล์ไม่รองรับ" }, 400);
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Length": String(obj.size),
    },
  });
});

export default app;
