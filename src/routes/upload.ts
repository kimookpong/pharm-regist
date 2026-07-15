import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { rateLimit } from "../middleware/ratelimit";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB (FR-02)
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// POST /api/upload — อัพโหลดสลิปเข้า R2 แล้วคืน key — จำกัด 20 ครั้ง/นาที/IP
app.post("/", rateLimit({ name: "upload", limit: 20, windowMs: 60_000 }), async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "ไม่พบไฟล์" }, 400);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: "ไฟล์ต้องไม่เกิน 10 MB" }, 400);
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return c.json({ error: "รองรับเฉพาะไฟล์ PDF, JPG, PNG" }, 400);
  }

  // key แบบสุ่มกันเดา + คงนามสกุลจริงตาม content-type
  const key = `slips/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ slip_key: key, slip_filename: file.name });
});

export default app;
