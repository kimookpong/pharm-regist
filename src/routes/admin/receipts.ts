import { Hono } from "hono";
import type { Env, Variables } from "../../types";
import { nextDocNo } from "../../lib/counter";
import { generateReceiptPdf } from "../../lib/pdf";
import { sendEmail } from "../../lib/email";
import { receiptEmail } from "../../lib/templates";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface RegRow {
  id: number;
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  email: string;
  receipt_name: string;
  receipt_address: string | null;
  amount: number;
  approve_status: string;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function getEvent(env: Env): Promise<{ title: string; zoom_link: string }> {
  const raw = await env.CONFIG.get("event");
  const e = raw ? JSON.parse(raw) : {};
  return { title: e.title ?? "การประชุมวิชาการออนไลน์", zoom_link: e.zoom_link ?? "" };
}

// POST /api/admin/registrations/:id/receipt — ออกใบเสร็จ (FR-05) + ส่งอีเมล+Zoom (FR-06)
app.post("/:id{[0-9]+}/receipt", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const reg = await c.env.DB.prepare(
    `SELECT id, reg_no, prefix, first_name, last_name, email, receipt_name, receipt_address, amount, approve_status
     FROM registrations WHERE id = ?1`,
  )
    .bind(id)
    .first<RegRow>();
  if (!reg) return c.json({ error: "ไม่พบข้อมูล" }, 404);
  if (reg.approve_status !== "approved") return c.json({ error: "ต้องอนุมัติก่อนออกใบเสร็จ" }, 400);

  // ออกใบเสร็จได้ครั้งเดียวต่อการลงทะเบียน
  const existing = await c.env.DB.prepare("SELECT receipt_no, pdf_key FROM receipts WHERE registration_id = ?1")
    .bind(id)
    .first<{ receipt_no: string; pdf_key: string }>();
  if (existing) return c.json({ error: "ออกใบเสร็จไปแล้ว", receipt_no: existing.receipt_no }, 409);

  const event = await getEvent(c.env);
  const receiptNo = await nextDocNo(c.env.DB, `receipt_${c.env.EVENT_YEAR}`, "REC", c.env.EVENT_YEAR);
  const issueDate = new Date().toISOString();

  const pdf = await generateReceiptPdf({
    orgName: event.title,
    receiptNo,
    issueDate,
    receiptName: reg.receipt_name,
    receiptAddress: reg.receipt_address ?? "",
    regNo: reg.reg_no,
    amount: reg.amount,
  });

  const pdfKey = `receipts/${c.env.EVENT_YEAR}/${receiptNo}.pdf`;
  await c.env.BUCKET.put(pdfKey, pdf, { httpMetadata: { contentType: "application/pdf" } });

  await c.env.DB.prepare(
    `INSERT INTO receipts (receipt_no, registration_id, issue_date, amount, pdf_key)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(receiptNo, id, issueDate, reg.amount, pdfKey)
    .run();

  // ส่งอีเมลแนบ PDF + Zoom link
  const mail = receiptEmail(
    `${reg.prefix}${reg.first_name} ${reg.last_name}`,
    reg.reg_no,
    receiptNo,
    event.zoom_link,
  );
  c.executionCtx.waitUntil(
    sendEmail(c.env, {
      to: reg.email,
      subject: mail.subject,
      html: mail.html,
      type: "receipt",
      registrationId: id,
      attachments: [{ filename: `${receiptNo}.pdf`, content: toBase64(pdf) }],
    }),
  );

  return c.json({ ok: true, receipt_no: receiptNo });
});

// GET /api/admin/registrations/:id/receipt/pdf — ดาวน์โหลด PDF ใบเสร็จ
app.get("/:id{[0-9]+}/receipt/pdf", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const rec = await c.env.DB.prepare("SELECT receipt_no, pdf_key FROM receipts WHERE registration_id = ?1")
    .bind(id)
    .first<{ receipt_no: string; pdf_key: string }>();
  if (!rec?.pdf_key) return c.json({ error: "ยังไม่ได้ออกใบเสร็จ" }, 404);

  const obj = await c.env.BUCKET.get(rec.pdf_key);
  if (!obj) return c.json({ error: "ไม่พบไฟล์" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `${c.req.query("download") === "1" ? "attachment" : "inline"}; filename="${rec.receipt_no}.pdf"`,
  );
  return new Response(obj.body, { headers });
});

export default app;
