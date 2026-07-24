import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { registrationSchema } from "../lib/validate";
import { nextDocNo } from "../lib/counter";
import { sendEmail } from "../lib/email";
import { confirmEmail } from "../lib/templates";
import { getEventSettings, emailCtx } from "../lib/event";
import { verifyTurnstile } from "../lib/turnstile";
import { rateLimit } from "../middleware/ratelimit";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/event — ข้อมูลหน้าแรก (FR-01)
app.get("/event", async (c) => {
  return c.json(await getEventSettings(c.env));
});

// GET /api/config — ค่า public สำหรับ frontend (Turnstile site key)
app.get("/config", (c) => {
  return c.json({ turnstile_sitekey: c.env.TURNSTILE_SITEKEY ?? "" });
});

// POST /api/register — รับลงทะเบียน (FR-02, FR-03) — จำกัด 5 ครั้ง/นาที/IP
app.post("/register", rateLimit({ name: "register", limit: 5, windowMs: 60_000 }), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const d = parsed.data;

  // ตรวจ Turnstile (ถ้าตั้ง secret ไว้) — กันบอท
  if (c.env.TURNSTILE_SECRET) {
    if (!d.turnstile_token) {
      return c.json({ error: "กรุณายืนยันว่าไม่ใช่บอท (Turnstile)" }, 400);
    }
    const ip = c.req.header("cf-connecting-ip") ?? undefined;
    const ok = await verifyTurnstile(c.env.TURNSTILE_SECRET, d.turnstile_token, ip);
    if (!ok) {
      return c.json({ error: "การยืนยัน Turnstile ไม่ผ่าน กรุณาลองใหม่" }, 403);
    }
  }

  // ตรวจ email ซ้ำ (FR-03) — มี unique index รองรับอีกชั้น
  const dup = await c.env.DB.prepare("SELECT 1 FROM registrations WHERE email = ?1")
    .bind(d.email)
    .first();
  if (dup) {
    return c.json({ error: "อีเมลนี้ถูกใช้ลงทะเบียนแล้ว" }, 409);
  }

  // ค่าลงทะเบียนดึงจากตั้งค่างาน (ไม่เชื่อค่าจาก client)
  const settings = await getEventSettings(c.env);
  const fee = settings.fee;

  const regNo = await nextDocNo(c.env.DB, `reg_${c.env.EVENT_YEAR}`, "REG", c.env.EVENT_YEAR);

  try {
    const res = await c.env.DB.prepare(
      `INSERT INTO registrations
        (reg_no, prefix, first_name, last_name, phone, email, occupation, license_no, position,
         workplace, work_address, receipt_name, receipt_address, receipt_type,
         postal_name, postal_address, postal_province, postal_zipcode,
         slip_key, slip_filename, amount)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)
       RETURNING id`,
    )
      .bind(
        regNo, d.prefix, d.first_name, d.last_name, d.phone, d.email, d.occupation,
        d.license_no ?? null, d.position, d.workplace ?? null, d.work_address ?? null,
        d.receipt_name, d.receipt_address ?? null, d.receipt_type,
        d.postal_name ?? null, d.postal_address ?? null, d.postal_province ?? null,
        d.postal_zipcode ?? null, d.slip_key, d.slip_filename, fee,
      )
      .first<{ id: number }>();

    // ส่งอีเมลยืนยันแบบ background ไม่ให้ block response (FR-06)
    const mail = confirmEmail(emailCtx(c.env, settings), {
      name: `${d.prefix}${d.first_name} ${d.last_name}`,
      regNo,
      amount: fee,
    });
    c.executionCtx.waitUntil(
      sendEmail(c.env, {
        to: d.email,
        subject: mail.subject,
        html: mail.html,
        type: "confirm",
        registrationId: res?.id,
      }),
    );

    return c.json({ reg_no: regNo, message: "ลงทะเบียนสำเร็จ" }, 201);
  } catch (e) {
    // unique index ชน (email ซ้ำจาก race) หรือ error อื่น
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE") && msg.includes("email")) {
      return c.json({ error: "อีเมลนี้ถูกใช้ลงทะเบียนแล้ว" }, 409);
    }
    return c.json({ error: "บันทึกข้อมูลไม่สำเร็จ" }, 500);
  }
});

// GET /api/status?reg_no=..&email=.. — ตรวจสอบสถานะ (ต้องรู้ทั้ง reg_no + email)
app.get("/status", async (c) => {
  const regNo = c.req.query("reg_no");
  const email = c.req.query("email");
  if (!regNo || !email) return c.json({ error: "กรุณาระบุหมายเลขลงทะเบียนและอีเมล" }, 400);

  const row = await c.env.DB.prepare(
    `SELECT reg_no, first_name, last_name, payment_status, approve_status, reject_reason, created_at
     FROM registrations WHERE reg_no = ?1 AND email = ?2`,
  )
    .bind(regNo, email)
    .first();

  if (!row) return c.json({ error: "ไม่พบข้อมูลการลงทะเบียน" }, 404);
  return c.json(row);
});

export default app;
