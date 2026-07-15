// เทมเพลตอีเมล (HTML) — โทนสีเขียวตาม UI spec (#2E7D32)
const BRAND = "#2E7D32";

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="th"><body style="margin:0;background:#F8FFF8;font-family:'Sarabun',Arial,sans-serif;color:#222">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:${BRAND};color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <h2 style="margin:0;font-size:18px">${title}</h2>
    </div>
    <div style="background:#fff;border:1px solid #DDEEDD;border-top:none;border-radius:0 0 12px 12px;padding:24px;line-height:1.7">
      ${body}
    </div>
    <p style="color:#888;font-size:12px;text-align:center;margin-top:16px">อีเมลอัตโนมัติ กรุณาอย่าตอบกลับ</p>
  </div></body></html>`;
}

export function confirmEmail(name: string, regNo: string): { subject: string; html: string } {
  return {
    subject: `ยืนยันการลงทะเบียน (${regNo})`,
    html: layout(
      "ได้รับการลงทะเบียนของท่านแล้ว",
      `<p>เรียน ${name}</p>
       <p>ระบบได้รับการลงทะเบียนและหลักฐานการชำระเงินของท่านเรียบร้อยแล้ว</p>
       <p>หมายเลขลงทะเบียน: <b style="color:${BRAND}">${regNo}</b></p>
       <p>เจ้าหน้าที่จะตรวจสอบหลักฐานและแจ้งผลการอนุมัติทางอีเมลอีกครั้ง ท่านสามารถตรวจสอบสถานะได้ที่หน้า "ตรวจสอบสถานะ"</p>`,
    ),
  };
}

export function approvedEmail(name: string, regNo: string): { subject: string; html: string } {
  return {
    subject: `อนุมัติการลงทะเบียนแล้ว (${regNo})`,
    html: layout(
      "การลงทะเบียนได้รับการอนุมัติ",
      `<p>เรียน ${name}</p>
       <p>การลงทะเบียนหมายเลข <b style="color:${BRAND}">${regNo}</b> ได้รับการอนุมัติแล้ว</p>
       <p>ใบเสร็จรับเงินและลิงก์เข้าร่วมประชุม (Zoom) จะจัดส่งให้ท่านต่อไป</p>`,
    ),
  };
}

export function receiptEmail(
  name: string,
  regNo: string,
  receiptNo: string,
  zoomLink: string,
): { subject: string; html: string } {
  const zoom = zoomLink
    ? `<p>ลิงก์เข้าร่วมประชุม (Zoom):</p>
       <p><a href="${zoomLink}" style="color:${BRAND};font-weight:bold">${zoomLink}</a></p>`
    : `<p>ทีมงานจะจัดส่งลิงก์เข้าร่วมประชุม (Zoom) ให้ท่านก่อนวันงาน</p>`;
  return {
    subject: `ใบเสร็จรับเงินและลิงก์เข้าร่วมประชุม (${receiptNo})`,
    html: layout(
      "ใบเสร็จรับเงิน",
      `<p>เรียน ${name}</p>
       <p>แนบใบเสร็จรับเงินเลขที่ <b style="color:${BRAND}">${receiptNo}</b> สำหรับการลงทะเบียน ${regNo} มาพร้อมอีเมลนี้ (ไฟล์ PDF)</p>
       ${zoom}
       <p>ขอบคุณที่เข้าร่วมการประชุม</p>`,
    ),
  };
}

export function rejectedEmail(name: string, regNo: string, reason: string): { subject: string; html: string } {
  return {
    subject: `แจ้งผลการตรวจสอบการลงทะเบียน (${regNo})`,
    html: layout(
      "ต้องการข้อมูลเพิ่มเติม",
      `<p>เรียน ${name}</p>
       <p>การลงทะเบียนหมายเลข <b>${regNo}</b> ยังไม่สามารถอนุมัติได้ ด้วยเหตุผล:</p>
       <p style="background:#FFF3E0;border-left:4px solid #FF9800;padding:12px;border-radius:4px">${reason}</p>
       <p>กรุณาติดต่อเจ้าหน้าที่หรือลงทะเบียนใหม่พร้อมหลักฐานที่ถูกต้อง</p>`,
    ),
  };
}
