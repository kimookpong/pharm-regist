-- ============================================================
-- ระบบรับลงทะเบียนประชุมวิชาการออนไลน์ — Initial schema
-- D1 (SQLite). ราคา/เงินเก็บเป็น "สตางค์" (INTEGER) กัน float
-- ============================================================

-- ---------- ผู้ลงทะเบียน (FR-02) ----------
CREATE TABLE registrations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_no            TEXT UNIQUE NOT NULL,            -- REG-2026-00001
  -- ข้อมูลส่วนบุคคล
  prefix            TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT NOT NULL,
  occupation        TEXT NOT NULL,
  license_no        TEXT,                            -- เฉพาะเภสัชกร
  position          TEXT NOT NULL,
  -- สถานที่ทำงาน
  workplace         TEXT,
  work_address      TEXT,
  -- ใบเสร็จ
  receipt_name      TEXT NOT NULL,
  receipt_address   TEXT,
  receipt_type      TEXT NOT NULL,                   -- 'email' | 'post'
  postal_name       TEXT,
  postal_address    TEXT,
  postal_province   TEXT,
  postal_zipcode    TEXT,
  -- หลักฐานการชำระเงิน
  slip_key          TEXT,                            -- R2 object key
  slip_filename     TEXT,
  amount            INTEGER,                         -- สตางค์
  -- สถานะ (แยก payment / approve ตาม FR-04)
  payment_status    TEXT NOT NULL DEFAULT 'submitted', -- pending|submitted
  approve_status    TEXT NOT NULL DEFAULT 'pending',   -- pending|approved|rejected
  reject_reason     TEXT,
  approved_by       INTEGER REFERENCES users(id),
  approved_at       TEXT,
  -- audit
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_reg_email    ON registrations(email);         -- FR-03 email ไม่ซ้ำ
CREATE INDEX        idx_reg_approve  ON registrations(approve_status);
CREATE INDEX        idx_reg_created  ON registrations(created_at);
CREATE INDEX        idx_reg_province ON registrations(postal_province); -- FR-10

-- ---------- ใบเสร็จ (FR-05) ----------
CREATE TABLE receipts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no        TEXT UNIQUE NOT NULL,            -- REC-2026-00001
  registration_id   INTEGER NOT NULL REFERENCES registrations(id),
  issue_date        TEXT NOT NULL DEFAULT (datetime('now')),
  amount            INTEGER NOT NULL,
  pdf_key           TEXT,                            -- R2 object key
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ผู้ใช้ระบบ ----------
CREATE TABLE users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  username          TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,                   -- pbkdf2$iter$salt$hash
  full_name         TEXT,
  role              TEXT NOT NULL,                   -- 'admin' | 'staff'
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- log อีเมล (FR-06) ----------
CREATE TABLE email_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id   INTEGER REFERENCES registrations(id),
  to_email          TEXT NOT NULL,
  type              TEXT NOT NULL,                   -- confirm|slip_received|approved|rejected|receipt|zoom
  status            TEXT NOT NULL,                   -- sent|failed
  provider_id       TEXT,
  error             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_email_reg ON email_logs(registration_id);

-- ---------- ตัวนับเลขที่เอกสาร (atomic running number) ----------
CREATE TABLE counters (
  name              TEXT PRIMARY KEY,               -- reg_2026 | receipt_2026
  value             INTEGER NOT NULL DEFAULT 0
);
