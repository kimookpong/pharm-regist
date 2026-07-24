import { Hono } from "hono";
import type { Env, Variables } from "../../types";
import { requireRole } from "../../middleware/jwt";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB สำหรับรูปวิทยากร
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// POST /api/admin/upload/speaker-photo — อัพโหลดรูปวิทยากรเข้า R2 (admin เท่านั้น)
app.post("/speaker-photo", requireRole("admin"), async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "ไม่พบไฟล์" }, 400);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: "ไฟล์ต้องไม่เกิน 5 MB" }, 400);
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return c.json({ error: "รองรับเฉพาะ JPG, PNG, WEBP" }, 400);
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const key = `speakers/${filename}`;
  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({
    photo_key: key,
    url: `/api/files/speakers/${filename}`,
  });
});

export default app;
