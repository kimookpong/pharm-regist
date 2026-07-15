-- ข้อมูลตั้งต้นสำหรับ dev/local
-- ผู้ดูแลระบบเริ่มต้น: username = admin / password = Admin@1234
-- !! เปลี่ยนรหัสผ่านทันทีบน production !!
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin', 'pbkdf2$100000$1f0f92a2b70fb1fb890f0af30b642d3c$feeef29eb3baa2e74172881e94f246e4ebfd2f7d2c649acc79b5d3da66b6059a', 'ผู้ดูแลระบบ', 'admin');
