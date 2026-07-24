-- รองรับการออกใบเสร็จใหม่: ยกเลิก (void) ใบเดิมแทนการลบ เพื่อคง audit trail
ALTER TABLE receipts ADD COLUMN voided_at TEXT;
