// แปลงสตางค์ → บาท (แสดงผล)
export function baht(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// วันที่จาก D1 (UTC "YYYY-MM-DD HH:MM:SS") → รูปแบบไทยสั้น
export function thaiDateTime(s: string): string {
  if (!s) return "-";
  const d = new Date(s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export const APPROVE_BADGE: Record<string, { text: string; color: string }> = {
  pending: { text: "รอตรวจสอบ", color: "var(--color-warning)" },
  approved: { text: "อนุมัติแล้ว", color: "var(--color-success)" },
  rejected: { text: "ไม่อนุมัติ", color: "var(--color-error)" },
};
