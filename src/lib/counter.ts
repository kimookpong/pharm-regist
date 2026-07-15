import type { D1Database } from "@cloudflare/workers-types";

/**
 * ออกเลขที่เอกสารแบบ atomic กัน running number ชน
 * ใช้ UPDATE ... RETURNING ในคำสั่งเดียว (D1 รองรับ) จึงปลอดภัยต่อ concurrent
 *
 * @param prefix เช่น "REG" หรือ "REC"
 * @param year   ปี พ.ศ./ค.ศ. ที่ใช้ในเลขเอกสาร
 * @returns เช่น REG-2026-00001
 */
export async function nextDocNo(
  db: D1Database,
  counterName: string,
  prefix: string,
  year: string,
): Promise<string> {
  // upsert + increment + return ค่าใหม่ ในคำสั่งเดียว
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?1, 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .bind(counterName)
    .first<{ value: number }>();

  const seq = (row?.value ?? 1).toString().padStart(5, "0");
  return `${prefix}-${year}-${seq}`;
}
