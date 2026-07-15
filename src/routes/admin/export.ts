import { Hono } from "hono";
import type { Env, Variables } from "../../types";
import { buildXlsx, type Cell } from "../../lib/xlsx";
import { generateRegistrationsPdf, type ListRow } from "../../lib/pdf";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface Row {
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  license_no: string | null;
  position: string;
  workplace: string | null;
  amount: number;
  receipt_type: string;
  postal_province: string | null;
  payment_status: string;
  approve_status: string;
  created_at: string;
}

// ดึงรายการตามตัวกรองเดียวกับหน้ารายชื่อ (q/status/date)
async function fetchRows(env: Env, url: URL): Promise<Row[]> {
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

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
  const res = await env.DB.prepare(
    `SELECT reg_no, prefix, first_name, last_name, phone, email, occupation, license_no, position,
            workplace, amount, receipt_type, postal_province, payment_status, approve_status, created_at
     FROM registrations ${whereSql} ORDER BY created_at DESC`,
  )
    .bind(...args)
    .all();
  return res.results as unknown as Row[];
}

const HEADERS = [
  "เลขลงทะเบียน", "คำนำหน้า", "ชื่อ", "นามสกุล", "เบอร์โทร", "อีเมล", "อาชีพ",
  "เลขใบประกอบวิชาชีพ", "ตำแหน่ง", "สถานที่ทำงาน", "ค่าลงทะเบียน(บาท)",
  "การรับใบเสร็จ", "จังหวัด", "สถานะชำระ", "สถานะอนุมัติ", "วันที่สมัคร",
];
const STATUS_TH: Record<string, string> = { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ" };

function toRow(r: Row): Cell[] {
  return [
    r.reg_no, r.prefix, r.first_name, r.last_name, r.phone, r.email, r.occupation,
    r.license_no ?? "", r.position, r.workplace ?? "", r.amount / 100,
    r.receipt_type === "post" ? "ไปรษณีย์" : "อีเมล", r.postal_province ?? "",
    r.payment_status, STATUS_TH[r.approve_status] ?? r.approve_status, r.created_at,
  ];
}

// GET /api/admin/export/csv
app.get("/csv", async (c) => {
  const rows = await fetchRows(c.env, new URL(c.req.url));
  const escape = (v: Cell) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [HEADERS, ...rows.map(toRow)].map((row) => row.map(escape).join(","));
  const csv = "﻿" + lines.join("\r\n"); // BOM ให้ Excel อ่านไทยถูก
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations.csv"`,
    },
  });
});

// GET /api/admin/export/xlsx
app.get("/xlsx", async (c) => {
  const rows = await fetchRows(c.env, new URL(c.req.url));
  const data: Cell[][] = [HEADERS, ...rows.map(toRow)];
  const buf = buildXlsx(data, "ผู้สมัคร");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registrations.xlsx"`,
    },
  });
});

// GET /api/admin/export/pdf
app.get("/pdf", async (c) => {
  const rows = await fetchRows(c.env, new URL(c.req.url));
  const listRows: ListRow[] = rows.map((r) => ({
    reg_no: r.reg_no,
    name: `${r.prefix}${r.first_name} ${r.last_name}`,
    occupation: r.occupation,
    amount: r.amount,
    status: r.approve_status,
    date: r.created_at.slice(0, 10),
  }));
  const pdf = await generateRegistrationsPdf(listRows, "รายชื่อผู้สมัครลงทะเบียน");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registrations.pdf"`,
    },
  });
});

export default app;
