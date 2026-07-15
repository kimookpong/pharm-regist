import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import sarabunRegular from "../fonts/Sarabun-Regular.ttf";
import sarabunBold from "../fonts/Sarabun-Bold.ttf";
import { bahtText } from "./bahttext";

// หมายเหตุ: pdf-lib ไม่ทำ complex text shaping ของภาษาไทยเต็มรูปแบบ
// (การวางวรรณยุกต์ซ้อนอาจเพี้ยนเล็กน้อย) แต่ Sarabun อ่านออกได้ในทางปฏิบัติ

export interface ReceiptData {
  orgName: string; // ชื่อหน่วยงาน/งานประชุม
  receiptNo: string;
  issueDate: string; // ISO/date string
  receiptName: string;
  receiptAddress: string;
  regNo: string;
  amount: number; // สตางค์
}

const GREEN = rgb(0.18, 0.49, 0.196);
const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0.15, 0.15, 0.15);

// อักขระประสม (สระบน/ล่าง + วรรณยุกต์) ของไทย — ต้องวางซ้อนโดยไม่กินความกว้าง
// เพราะ pdf-lib ไม่ทำ GPOS mark positioning เอง
const THAI_MARKS = new Set([
  0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e38, 0x0e39, 0x0e3a, // สระบน/ล่าง
  0x0e47, 0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c, 0x0e4d, 0x0e4e, // วรรณยุกต์/ไม้ไต่คู้/นิคหิต
]);
// สระบน (อยู่เหนือพยัญชนะ) — ถ้าวรรณยุกต์ตามหลังสระบน ต้องยกวรรณยุกต์ให้สูงขึ้นอีกชั้น
const ABOVE_VOWELS = new Set([0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e4d]);
const TONE_ABOVE = new Set([0x0e47, 0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c]);

// ความกว้างจริงของข้อความ (นับเฉพาะพยัญชนะฐาน — อักขระประสมกว้าง 0)
function measureThai(font: PDFFont, s: string, size: number): number {
  let w = 0;
  for (const ch of s) {
    if (!THAI_MARKS.has(ch.codePointAt(0)!)) w += font.widthOfTextAtSize(ch, size);
  }
  return w;
}

// วาดข้อความแบบ cluster-aware: อักขระประสมวาดทับฐานเดิม ไม่เลื่อน x
function drawThai(
  page: PDFPage,
  s: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
): number {
  let cx = x;
  let baseX = x;
  let baseW = 0;
  let prevCp = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (THAI_MARKS.has(cp)) {
      // วางกึ่งกลางเหนือ/ใต้พยัญชนะฐาน (Sarabun OTF ออกแบบให้ GPOS จัดตำแหน่ง จึงต้อง center เอง)
      const markW = font.widthOfTextAtSize(ch, size);
      // วรรณยุกต์ที่ตามหลังสระบน → ยกสูงขึ้นเพื่อไม่ทับสระ
      const dy = TONE_ABOVE.has(cp) && ABOVE_VOWELS.has(prevCp) ? size * 0.26 : 0;
      page.drawText(ch, { x: baseX + (baseW - markW) / 2, y: y + dy, size, font, color });
    } else {
      page.drawText(ch, { x: cx, y, size, font, color });
      baseX = cx;
      baseW = font.widthOfTextAtSize(ch, size);
      cx += baseW;
    }
    prevCp = cp;
  }
  return cx - x;
}

function baht(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateReceiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(sarabunRegular);
  const bold = await doc.embedFont(sarabunBold);

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const M = 56; // margin

  const text = (
    s: string,
    x: number,
    y: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    drawThai(page, s, x, y, opts.size ?? 12, opts.font ?? regular, opts.color ?? BLACK);
  };
  const right = (
    s: string,
    xRight: number,
    y: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const f = opts.font ?? regular;
    const size = opts.size ?? 12;
    text(s, xRight - measureThai(f, s, size), y, opts);
  };

  let y = height - M;

  // หัวกระดาษ
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: GREEN });
  text(d.orgName, M, y, { size: 18, font: bold, color: GREEN });
  y -= 26;
  text("ใบเสร็จรับเงิน / RECEIPT", M, y, { size: 14, font: bold });
  y -= 34;

  // เลขที่ + วันที่ (ชิดขวา)
  const issue = new Date(d.issueDate.replace(" ", "T") + (d.issueDate.includes("T") ? "" : "Z"));
  const issueTh = isNaN(issue.getTime())
    ? d.issueDate
    : issue.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  right(`เลขที่ใบเสร็จ: ${d.receiptNo}`, width - M, height - M, { size: 11, font: bold });
  right(`วันที่: ${issueTh}`, width - M, height - M - 18, { size: 11 });

  // ผู้รับเงินจาก
  text("ได้รับเงินจาก", M, y, { size: 12, color: GRAY });
  text(d.receiptName, M + 90, y, { size: 12, font: bold });
  y -= 20;
  if (d.receiptAddress) {
    text("ที่อยู่", M, y, { size: 12, color: GRAY });
    text(d.receiptAddress, M + 90, y, { size: 11 });
    y -= 20;
  }
  text("อ้างอิงการลงทะเบียน", M, y, { size: 12, color: GRAY });
  text(d.regNo, M + 130, y, { size: 12 });
  y -= 30;

  // ตารางรายการ
  const tableTop = y;
  page.drawRectangle({ x: M, y: tableTop - 24, width: width - 2 * M, height: 24, color: GREEN });
  text("รายการ", M + 12, tableTop - 17, { size: 12, font: bold, color: rgb(1, 1, 1) });
  right("จำนวนเงิน (บาท)", width - M - 12, tableTop - 17, { size: 12, font: bold, color: rgb(1, 1, 1) });
  y = tableTop - 24;

  const rowH = 28;
  page.drawRectangle({ x: M, y: y - rowH, width: width - 2 * M, height: rowH, borderColor: GREEN, borderWidth: 0.5 });
  text(`ค่าลงทะเบียนเข้าร่วม${d.orgName}`, M + 12, y - 19, { size: 11 });
  right(baht(d.amount), width - M - 12, y - 19, { size: 11 });
  y -= rowH;

  // รวม
  page.drawRectangle({ x: M, y: y - rowH, width: width - 2 * M, height: rowH, color: rgb(0.97, 1, 0.97) });
  text("รวมทั้งสิ้น", M + 12, y - 19, { size: 12, font: bold });
  right(`${baht(d.amount)} บาท`, width - M - 12, y - 19, { size: 12, font: bold, color: GREEN });
  y -= rowH + 10;

  // จำนวนเงินเป็นตัวอักษร
  page.drawRectangle({ x: M, y: y - 26, width: width - 2 * M, height: 26, borderColor: GREEN, borderWidth: 0.5 });
  const words = `(${bahtText(d.amount)})`;
  text(words, M + (width - 2 * M - measureThai(bold, words, 12)) / 2, y - 18, { size: 12, font: bold });
  y -= 60;

  // ลายเซ็น
  text("......................................................", width - M - 200, y, { size: 11, color: GRAY });
  y -= 16;
  text("ผู้รับเงิน / เจ้าหน้าที่", width - M - 150, y, { size: 11, color: GRAY });

  // ท้ายกระดาษ
  text("เอกสารนี้ออกโดยระบบอัตโนมัติ", M, M, { size: 9, color: GRAY });

  return doc.save();
}

export interface ListRow {
  reg_no: string;
  name: string;
  occupation: string;
  amount: number; // สตางค์
  status: string;
  date: string;
}

// รายงานรายชื่อผู้สมัคร (สำหรับ Export PDF — FR-09)
export async function generateRegistrationsPdf(rows: ListRow[], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(sarabunRegular);
  const bold = await doc.embedFont(sarabunBold);

  const M = 40;
  const pageW = 595.28;
  const pageH = 841.89;
  // คอลัมน์: เลขลงทะเบียน | ชื่อ | อาชีพ | จำนวนเงิน(ขวา) | สถานะ | วันที่
  const cols = [
    { x: M, w: 90, label: "เลขลงทะเบียน" },
    { x: M + 90, w: 150, label: "ชื่อ-นามสกุล" },
    { x: M + 240, w: 80, label: "อาชีพ" },
    { x: M + 320, w: 70, label: "จำนวนเงิน", right: true },
    { x: M + 390, w: 60, label: "สถานะ" },
    { x: M + 450, w: 75, label: "วันที่" },
  ];
  const rowH = 20;
  const money = (s: number) => (s / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const STATUS: Record<string, string> = { pending: "รอตรวจ", approved: "อนุมัติ", rejected: "ไม่อนุมัติ" };

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - M;

  const draw = (s: string, x: number, yy: number, size: number, font = regular, color = BLACK) =>
    drawThai(page, s, x, yy, size, font, color);
  const drawRight = (s: string, xRight: number, yy: number, size: number, font = regular) =>
    drawThai(page, s, xRight - measureThai(font, s, size), yy, size, font, BLACK);

  const header = () => {
    page.drawRectangle({ x: 0, y: pageH - 6, width: pageW, height: 6, color: GREEN });
    draw(title, M, y, 14, bold, GREEN);
    y -= 22;
    page.drawRectangle({ x: M, y: y - 16, width: pageW - 2 * M, height: 16, color: GREEN });
    const white = rgb(1, 1, 1);
    for (const c of cols) {
      const lx = c.right ? c.x + c.w - 4 - measureThai(bold, c.label, 9) : c.x + 4;
      draw(c.label, lx, y - 12, 9, bold, white);
    }
    y -= 16;
  };

  header();

  for (const r of rows) {
    if (y - rowH < M + 20) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - M;
      header();
    }
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: pageW - M, y: y - rowH },
      thickness: 0.3,
      color: rgb(0.85, 0.9, 0.85),
    });
    const yy = y - 14;
    draw(r.reg_no, cols[0].x + 4, yy, 8);
    draw(r.name, cols[1].x + 4, yy, 8);
    draw(r.occupation, cols[2].x + 4, yy, 8);
    drawRight(money(r.amount), cols[3].x + cols[3].w - 4, yy, 8);
    draw(STATUS[r.status] ?? r.status, cols[4].x + 4, yy, 8);
    draw(r.date, cols[5].x + 4, yy, 8);
    y -= rowH;
  }

  draw(`รวม ${rows.length} รายการ`, M, M - 10, 9, bold, GRAY);
  return doc.save();
}
