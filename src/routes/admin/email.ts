import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../../types";
import { sendEmail, type EmailType } from "../../lib/email";
import { getEventSettings, emailCtx } from "../../lib/event";
import { toBase64 } from "../../lib/base64";
import {
  confirmEmail,
  approvedEmail,
  rejectedEmail,
  receiptEmail,
  zoomEmail,
} from "../../lib/templates";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface RegRow {
  id: number;
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  email: string;
  amount: number;
  reject_reason: string | null;
}

const sendSchema = z.object({
  type: z.enum(["confirm", "approved", "rejected", "receipt", "zoom"]),
});

// POST /api/admin/registrations/:id/send-email — ส่งอีเมลซ้ำแบบ manual (กี่ครั้งก็ได้)
app.post("/:id{[0-9]+}/send-email", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const parsed = sendSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "ระบุชนิดอีเมลไม่ถูกต้อง" }, 400);
  const type = parsed.data.type;

  const reg = await c.env.DB.prepare(
    "SELECT id, reg_no, prefix, first_name, last_name, email, amount, reject_reason FROM registrations WHERE id = ?1",
  )
    .bind(id)
    .first<RegRow>();
  if (!reg) return c.json({ error: "ไม่พบข้อมูล" }, 404);

  const settings = await getEventSettings(c.env);
  const ctx = emailCtx(c.env, settings);
  const name = `${reg.prefix}${reg.first_name} ${reg.last_name}`;

  let mail: { subject: string; html: string };
  let attachments: Array<{ filename: string; content: string }> | undefined;

  switch (type) {
    case "confirm":
      mail = confirmEmail(ctx, { name, regNo: reg.reg_no, amount: reg.amount });
      break;
    case "approved":
      mail = approvedEmail(ctx, { name, regNo: reg.reg_no });
      break;
    case "rejected":
      if (!reg.reject_reason) return c.json({ error: "ยังไม่มีเหตุผลไม่อนุมัติที่บันทึกไว้" }, 400);
      mail = rejectedEmail(ctx, { name, regNo: reg.reg_no, reason: reg.reject_reason });
      break;
    case "zoom":
      mail = zoomEmail(ctx, { name, regNo: reg.reg_no, zoomLink: settings.zoom_link });
      break;
    case "receipt": {
      const rec = await c.env.DB.prepare(
        "SELECT receipt_no, amount, pdf_key FROM receipts WHERE registration_id = ?1 AND voided_at IS NULL ORDER BY id DESC LIMIT 1",
      )
        .bind(id)
        .first<{ receipt_no: string; amount: number; pdf_key: string | null }>();
      if (!rec) return c.json({ error: "ยังไม่ได้ออกใบเสร็จ" }, 400);
      mail = receiptEmail(ctx, {
        name,
        regNo: reg.reg_no,
        receiptNo: rec.receipt_no,
        amount: rec.amount,
        zoomLink: settings.zoom_link,
      });
      if (rec.pdf_key) {
        const obj = await c.env.BUCKET.get(rec.pdf_key);
        if (obj) {
          const buf = new Uint8Array(await obj.arrayBuffer());
          attachments = [{ filename: `${rec.receipt_no}.pdf`, content: toBase64(buf) }];
        }
      }
      break;
    }
  }

  // await (ไม่ใช่ waitUntil) เพราะ admin ต้องรู้ผลทันที
  const sent = await sendEmail(c.env, {
    to: reg.email,
    subject: mail.subject,
    html: mail.html,
    type: type as EmailType,
    registrationId: id,
    attachments,
  });

  return c.json({ ok: sent, sent }, sent ? 200 : 502);
});

// GET /api/admin/registrations/:id/emails — ประวัติการส่งอีเมล (email_logs)
app.get("/:id{[0-9]+}/emails", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const rows = await c.env.DB.prepare(
    "SELECT type, status, error, created_at FROM email_logs WHERE registration_id = ?1 ORDER BY id DESC",
  )
    .bind(id)
    .all();
  return c.json(rows.results);
});

export default app;
