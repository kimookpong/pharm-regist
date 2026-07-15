// แปลงจำนวนเงิน (สตางค์) เป็นข้อความภาษาไทย
// เช่น 150000 → "หนึ่งพันห้าร้อยบาทถ้วน", 2550 → "ยี่สิบห้าบาทห้าสิบสตางค์"
const NUM = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const UNIT = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

// อ่านเลขจำนวนเต็มความยาวไม่เกิน 6 หลัก
function readSix(s: string): string {
  let result = "";
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = Number(s[i]);
    const pos = len - 1 - i; // 0=หน่วย,1=สิบ,...,5=แสน
    if (d === 0) continue;
    if (pos === 0 && d === 1 && len > 1) result += "เอ็ด";
    else if (pos === 1 && d === 1) result += "สิบ";
    else if (pos === 1 && d === 2) result += "ยี่สิบ";
    else result += NUM[d] + UNIT[pos];
  }
  return result;
}

function readInteger(n: number): string {
  if (n === 0) return "ศูนย์";
  const s = String(n);
  if (s.length > 6) {
    const head = s.slice(0, s.length - 6);
    const tail = s.slice(s.length - 6);
    const tailStr = Number(tail) === 0 ? "" : readSix(tail.replace(/^0+/, ""));
    return readInteger(Number(head)) + "ล้าน" + tailStr;
  }
  return readSix(s);
}

export function bahtText(satang: number): string {
  const baht = Math.floor(satang / 100);
  const st = satang % 100;
  let result = readInteger(baht) + "บาท";
  result += st === 0 ? "ถ้วน" : readInteger(st) + "สตางค์";
  return result;
}
