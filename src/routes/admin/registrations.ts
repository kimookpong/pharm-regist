import { Hono } from "hono";
import type { Env, Variables } from "../../types";
import { adminEditSchema } from "../../lib/validate";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/admin/registrations — รายชื่อ + ค้นหา + กรอง + แบ่งหน้า (FR-08)
//   query: q (ชื่อ/email/เบอร์), status, date_from, date_to, page, limit
app.get("/", async (c) => {
  const q = c.req.query("q")?.trim();
  const status = c.req.query("status"); // pending|approved|rejected
  const dateFrom = c.req.query("date_from");
  const dateTo = c.req.query("date_to");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const args: unknown[] = [];

  if (q) {
    where.push(`(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR reg_no LIKE ?)`);
    const like = `%${q}%`;
    args.push(like, like, like, like, like);
  }
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    where.push(`approve_status = ?`);
    args.push(status);
  }
  if (dateFrom) {
    where.push(`created_at >= ?`);
    args.push(dateFrom);
  }
  if (dateTo) {
    where.push(`created_at <= ?`);
    args.push(`${dateTo} 23:59:59`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM registrations ${whereSql}`)
    .bind(...args)
    .first<{ n: number }>();

  const rows = await c.env.DB.prepare(
    `SELECT id, reg_no, prefix, first_name, last_name, phone, email, occupation,
            amount, payment_status, approve_status, created_at
     FROM registrations ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...args, limit, offset)
    .all();

  return c.json({
    data: rows.results,
    page,
    limit,
    total: total?.n ?? 0,
    pages: Math.ceil((total?.n ?? 0) / limit),
  });
});

// GET /api/admin/registrations/:id — รายละเอียดเต็ม (+ ใบเสร็จที่ยัง active)
app.get("/:id{[0-9]+}", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await c.env.DB.prepare(
    `SELECT r.*, rc.receipt_no, rc.issue_date AS receipt_issue_date
     FROM registrations r
     LEFT JOIN receipts rc ON rc.registration_id = r.id AND rc.voided_at IS NULL
     WHERE r.id = ?1`,
  )
    .bind(id)
    .first();
  if (!row) return c.json({ error: "ไม่พบข้อมูล" }, 404);
  return c.json(row);
});

// PUT /api/admin/registrations/:id — แก้ไขข้อมูลลงทะเบียน (FR: admin edit)
app.put("/:id{[0-9]+}", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const parsed = adminEditSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  const exists = await c.env.DB.prepare("SELECT 1 FROM registrations WHERE id = ?1").bind(id).first();
  if (!exists) return c.json({ error: "ไม่พบข้อมูล" }, 404);

  // email ต้องไม่ซ้ำกับคนอื่น
  const dup = await c.env.DB.prepare("SELECT 1 FROM registrations WHERE email = ?1 AND id <> ?2")
    .bind(d.email, id)
    .first();
  if (dup) return c.json({ error: "อีเมลนี้ถูกใช้โดยผู้ลงทะเบียนคนอื่น" }, 409);

  try {
    await c.env.DB.prepare(
      `UPDATE registrations SET
         prefix=?2, first_name=?3, last_name=?4, phone=?5, email=?6, occupation=?7, license_no=?8,
         position=?9, workplace=?10, work_address=?11, receipt_name=?12, receipt_address=?13,
         receipt_type=?14, postal_name=?15, postal_address=?16, postal_province=?17, postal_zipcode=?18,
         amount=?19, updated_at=datetime('now')
       WHERE id=?1`,
    )
      .bind(
        id, d.prefix, d.first_name, d.last_name, d.phone, d.email, d.occupation, d.license_no ?? null,
        d.position, d.workplace ?? null, d.work_address ?? null, d.receipt_name, d.receipt_address ?? null,
        d.receipt_type, d.postal_name ?? null, d.postal_address ?? null, d.postal_province ?? null,
        d.postal_zipcode ?? null, d.amount,
      )
      .run();
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE") && msg.includes("email")) {
      return c.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, 409);
    }
    return c.json({ error: "บันทึกไม่สำเร็จ" }, 500);
  }
});

// GET /api/admin/registrations/:id/slip — เปิด/ดาวน์โหลดหลักฐาน (FR-04)
app.get("/:id{[0-9]+}/slip", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const reg = await c.env.DB.prepare("SELECT slip_key, slip_filename FROM registrations WHERE id = ?1")
    .bind(id)
    .first<{ slip_key: string | null; slip_filename: string | null }>();
  if (!reg?.slip_key) return c.json({ error: "ไม่พบไฟล์" }, 404);

  const obj = await c.env.BUCKET.get(reg.slip_key);
  if (!obj) return c.json({ error: "ไม่พบไฟล์ใน storage" }, 404);

  const download = c.req.query("download") === "1";
  const headers = new Headers();
  headers.set("Content-Type", obj.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${reg.slip_filename ?? "slip"}"`,
  );
  return new Response(obj.body, { headers });
});

export default app;
