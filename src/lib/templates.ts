// เทมเพลตอีเมล (HTML) — table-based + inline styles เพื่อรองรับ email client ทุกตัว
// โทนเขียวตาม UI spec (#2E7D32)
const BRAND = "#2E7D32";
const BRAND_DARK = "#1B5E20";
// prefix เริ่มต้นของหัวข้ออีเมลทุกฉบับ
const SUBJECT_PREFIX = "[ประชุมวิชาการเภสัชศาสตร์ ] ";
const BG = "#F8FFF8";
const LINE = "#DDEEDD";

export interface EmailEvent {
  title: string;
  event_date?: string;
  cpe?: number;
  contact?: string;
}
export interface EmailCtx {
  event: EmailEvent;
  appUrl: string; // เช่น https://cpewu.konthai.app
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
}

function money(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ปุ่ม CTA (bulletproof button แบบ table)
function button(label: string, url: string, color = BRAND): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border-radius:10px;background:${color}">
    <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
  </td></tr></table>`;
}

// กล่องรายละเอียด (ตาราง key-value)
function detailsBox(rows: Array<[string, string]>): string {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#777;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td>
         <td style="padding:6px 0 6px 16px;font-size:14px;font-weight:600;color:#263238">${v}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG};border:1px solid ${LINE};border-radius:10px;padding:12px 16px;margin:8px 0 4px"><tbody>${trs}</tbody></table>`;
}

function layout(
  ctx: EmailCtx,
  opts: { heading: string; bodyHtml: string; preheader?: string },
): string {
  const ev = ctx.event;
  const sub = [ev.event_date, ev.cpe ? `CPE ${ev.cpe} หน่วย` : ""].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Sarabun',-apple-system,Arial,sans-serif;color:#263238">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%">
    <!-- header -->
    <tr><td style="background:${BRAND};background:linear-gradient(0deg,${BRAND},${BRAND});border-radius:14px 14px 0 0;padding:22px 28px">
      <div style="color:#ffffff;font-size:19px;font-weight:700;line-height:1.35">${esc(ev.title)}</div>
      ${sub ? `<div style="color:#D7F0D9;font-size:13px;margin-top:4px">${esc(sub)}</div>` : ""}
    </td></tr>
    <!-- body -->
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:none;border-radius:0 0 14px 14px;padding:28px">
      <div style="font-size:17px;font-weight:700;color:${BRAND_DARK};margin-bottom:12px">${esc(opts.heading)}</div>
      <div style="font-size:14px;line-height:1.75;color:#37474F">${opts.bodyHtml}</div>
    </td></tr>
    <!-- footer -->
    <tr><td style="padding:16px 28px;text-align:center;color:#9AA5A0;font-size:12px;line-height:1.6">
      ${ev.contact ? `ติดต่อสอบถาม: ${esc(ev.contact)}<br>` : ""}
      อีเมลนี้ส่งอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

export function confirmEmail(
  ctx: EmailCtx,
  d: { name: string; regNo: string; amount: number },
): { subject: string; html: string } {
  return {
    subject: `${SUBJECT_PREFIX}ยืนยันการลงทะเบียน ${d.regNo}`,
    html: layout(ctx, {
      heading: "ได้รับการลงทะเบียนของท่านแล้ว",
      preheader: `หมายเลขลงทะเบียน ${d.regNo} — รอเจ้าหน้าที่ตรวจสอบ`,
      bodyHtml: `<p style="margin:0 0 10px">เรียน ${esc(d.name)}</p>
        <p style="margin:0 0 4px">ระบบได้รับการลงทะเบียนและหลักฐานการชำระเงินของท่านเรียบร้อยแล้ว เจ้าหน้าที่จะตรวจสอบและแจ้งผลการอนุมัติทางอีเมลอีกครั้ง</p>
        ${detailsBox([
          ["หมายเลขลงทะเบียน", `<span style="color:${BRAND}">${esc(d.regNo)}</span>`],
          ["ชื่อผู้ลงทะเบียน", esc(d.name)],
          ["ค่าลงทะเบียน", `${money(d.amount)} บาท`],
        ])}
        ${button("ตรวจสอบสถานะการลงทะเบียน", `${ctx.appUrl}/status`)}`,
    }),
  };
}

export function approvedEmail(ctx: EmailCtx, d: { name: string; regNo: string }): { subject: string; html: string } {
  return {
    subject: `${SUBJECT_PREFIX}อนุมัติการลงทะเบียนแล้ว ${d.regNo}`,
    html: layout(ctx, {
      heading: "การลงทะเบียนได้รับการอนุมัติ ✓",
      preheader: `การลงทะเบียน ${d.regNo} ได้รับการอนุมัติแล้ว`,
      bodyHtml: `<p style="margin:0 0 10px">เรียน ${esc(d.name)}</p>
        <p style="margin:0 0 4px">การลงทะเบียนหมายเลข <b style="color:${BRAND}">${esc(d.regNo)}</b> ได้รับการอนุมัติเรียบร้อยแล้ว</p>
        <p style="margin:0 0 4px">ใบเสร็จรับเงินและลิงก์เข้าร่วมประชุม (Zoom) จะจัดส่งให้ท่านทางอีเมลต่อไป</p>
        ${button("ตรวจสอบสถานะ", `${ctx.appUrl}/status`)}`,
    }),
  };
}

export function receiptEmail(
  ctx: EmailCtx,
  d: { name: string; regNo: string; receiptNo: string; amount: number; zoomLink: string },
): { subject: string; html: string } {
  const zoom = d.zoomLink
    ? `<p style="margin:12px 0 0">ท่านสามารถเข้าร่วมการประชุมออนไลน์ผ่านลิงก์ด้านล่าง</p>${button("เข้าร่วมประชุม (Zoom)", d.zoomLink)}`
    : `<p style="margin:12px 0 0">ทีมงานจะจัดส่งลิงก์เข้าร่วมประชุม (Zoom) ให้ท่านก่อนวันงาน</p>`;
  return {
    subject: `${SUBJECT_PREFIX}ใบเสร็จรับเงิน ${d.receiptNo} และลิงก์เข้าร่วมประชุม`,
    html: layout(ctx, {
      heading: "ใบเสร็จรับเงิน",
      preheader: `ใบเสร็จเลขที่ ${d.receiptNo} (แนบไฟล์ PDF)`,
      bodyHtml: `<p style="margin:0 0 10px">เรียน ${esc(d.name)}</p>
        <p style="margin:0 0 4px">แนบใบเสร็จรับเงิน (ไฟล์ PDF) สำหรับการลงทะเบียนของท่านมาพร้อมอีเมลนี้</p>
        ${detailsBox([
          ["เลขที่ใบเสร็จ", `<span style="color:${BRAND}">${esc(d.receiptNo)}</span>`],
          ["หมายเลขลงทะเบียน", esc(d.regNo)],
          ["จำนวนเงิน", `${money(d.amount)} บาท`],
        ])}
        ${zoom}`,
    }),
  };
}

export function rejectedEmail(
  ctx: EmailCtx,
  d: { name: string; regNo: string; reason: string },
): { subject: string; html: string } {
  return {
    subject: `${SUBJECT_PREFIX}แจ้งผลการตรวจสอบการลงทะเบียน ${d.regNo}`,
    html: layout(ctx, {
      heading: "ต้องการข้อมูลเพิ่มเติม",
      preheader: `การลงทะเบียน ${d.regNo} ยังไม่สามารถอนุมัติได้`,
      bodyHtml: `<p style="margin:0 0 10px">เรียน ${esc(d.name)}</p>
        <p style="margin:0 0 8px">การลงทะเบียนหมายเลข <b>${esc(d.regNo)}</b> ยังไม่สามารถอนุมัติได้ ด้วยเหตุผล:</p>
        <div style="background:#FFF3E0;border-left:4px solid #FF9800;padding:12px 14px;border-radius:6px;font-size:14px">${esc(d.reason)}</div>
        <p style="margin:12px 0 4px">กรุณาติดต่อเจ้าหน้าที่ หรือลงทะเบียนใหม่พร้อมหลักฐานที่ถูกต้อง</p>
        ${button("ลงทะเบียนใหม่", `${ctx.appUrl}/register`, "#EF6C00")}`,
    }),
  };
}

export function zoomEmail(
  ctx: EmailCtx,
  d: { name: string; regNo: string; zoomLink: string },
): { subject: string; html: string } {
  return {
    subject: `${SUBJECT_PREFIX}ลิงก์เข้าร่วมประชุม ${ctx.event.title}`,
    html: layout(ctx, {
      heading: "ลิงก์เข้าร่วมประชุม (Zoom)",
      preheader: `ลิงก์เข้าร่วม ${ctx.event.title}`,
      bodyHtml: `<p style="margin:0 0 10px">เรียน ${esc(d.name)}</p>
        <p style="margin:0 0 4px">ท่าน (การลงทะเบียน ${esc(d.regNo)}) สามารถเข้าร่วมการประชุมออนไลน์ผ่านลิงก์ด้านล่าง</p>
        ${
          d.zoomLink
            ? button("เข้าร่วมประชุม (Zoom)", d.zoomLink) +
              `<p style="margin:4px 0 0;font-size:13px;color:#777;word-break:break-all">${esc(d.zoomLink)}</p>`
            : `<p style="color:#EF6C00">ยังไม่ได้ตั้งค่าลิงก์ Zoom กรุณาติดต่อเจ้าหน้าที่</p>`
        }`,
    }),
  };
}
