import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../../types";
import { requireRole } from "../../middleware/jwt";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const DEFAULT_EVENT = {
  title: "การประชุมวิชาการออนไลน์",
  banner: "",
  detail: "",
  event_date: "",
  cpe: 0,
  activity_code: "",
  agenda: [] as Array<{ time: string; topic: string }>,
  contact: "",
  fee: 0, // สตางค์
  zoom_link: "",
  register_open: true,
};

const eventSchema = z.object({
  title: z.string().max(200),
  banner: z.string().max(1000).optional().default(""),
  detail: z.string().max(5000).optional().default(""),
  event_date: z.string().max(200).optional().default(""),
  cpe: z.number().min(0).max(1000).optional().default(0),
  activity_code: z.string().max(100).optional().default(""),
  agenda: z.array(z.object({ time: z.string().max(50), topic: z.string().max(300) })).optional().default([]),
  contact: z.string().max(500).optional().default(""),
  fee: z.number().int().min(0).optional().default(0), // สตางค์
  zoom_link: z.string().max(1000).optional().default(""),
  register_open: z.boolean().optional().default(true),
});

// GET /api/admin/settings — อ่านค่าตั้งงาน (staff+admin ดูได้)
app.get("/", async (c) => {
  const raw = await c.env.CONFIG.get("event");
  return c.json(raw ? { ...DEFAULT_EVENT, ...JSON.parse(raw) } : DEFAULT_EVENT);
});

// PUT /api/admin/settings — บันทึก (เฉพาะ admin)
app.put("/", requireRole("admin"), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors }, 400);
  }
  await c.env.CONFIG.put("event", JSON.stringify(parsed.data));
  return c.json({ ok: true });
});

export default app;
