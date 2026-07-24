import { Hono } from "hono";
import { z } from "zod";
import type { Env, Variables } from "../../types";
import { sendEmail } from "../../lib/email";
import { approvedEmail, rejectedEmail } from "../../lib/templates";
import { getEventSettings, emailCtx } from "../../lib/event";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface RegRow {
  id: number;
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  email: string;
  approve_status: string;
}

async function loadReg(env: Env, id: number): Promise<RegRow | null> {
  return env.DB.prepare(
    "SELECT id, reg_no, prefix, first_name, last_name, email, approve_status FROM registrations WHERE id = ?1",
  )
    .bind(id)
    .first<RegRow>();
}

// POST /api/admin/registrations/:id/approve — อนุมัติ (FR-04) + อีเมลแจ้ง (FR-06)
app.post("/:id{[0-9]+}/approve", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const reg = await loadReg(c.env, id);
  if (!reg) return c.json({ error: "ไม่พบข้อมูล" }, 404);
  if (reg.approve_status === "approved") return c.json({ error: "รายการนี้อนุมัติแล้ว" }, 409);

  const user = c.get("user");
  await c.env.DB.prepare(
    `UPDATE registrations
       SET approve_status = 'approved', reject_reason = NULL,
           approved_by = ?2, approved_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?1`,
  )
    .bind(id, user.sub)
    .run();

  const ctx = emailCtx(c.env, await getEventSettings(c.env));
  const mail = approvedEmail(ctx, { name: `${reg.prefix}${reg.first_name} ${reg.last_name}`, regNo: reg.reg_no });
  c.executionCtx.waitUntil(
    sendEmail(c.env, { to: reg.email, subject: mail.subject, html: mail.html, type: "approved", registrationId: id }),
  );

  return c.json({ ok: true, approve_status: "approved" });
});

// POST /api/admin/registrations/:id/reject — ไม่อนุมัติ + ระบุเหตุผล (FR-04) + อีเมล (FR-06)
const rejectSchema = z.object({ reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500) });

app.post("/:id{[0-9]+}/reject", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "กรุณาระบุเหตุผล" }, 400);

  const reg = await loadReg(c.env, id);
  if (!reg) return c.json({ error: "ไม่พบข้อมูล" }, 404);

  const user = c.get("user");
  await c.env.DB.prepare(
    `UPDATE registrations
       SET approve_status = 'rejected', reject_reason = ?2,
           approved_by = ?3, approved_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?1`,
  )
    .bind(id, parsed.data.reason, user.sub)
    .run();

  const ctx = emailCtx(c.env, await getEventSettings(c.env));
  const mail = rejectedEmail(ctx, {
    name: `${reg.prefix}${reg.first_name} ${reg.last_name}`,
    regNo: reg.reg_no,
    reason: parsed.data.reason,
  });
  c.executionCtx.waitUntil(
    sendEmail(c.env, { to: reg.email, subject: mail.subject, html: mail.html, type: "rejected", registrationId: id }),
  );

  return c.json({ ok: true, approve_status: "rejected" });
});

export default app;
