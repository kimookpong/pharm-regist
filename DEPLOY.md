# คู่มือ Deploy — ระบบรับลงทะเบียนประชุมวิชาการออนไลน์

รันบน **Cloudflare Workers (free tier)** ทั้งหมด: Workers + D1 + R2 + KV

## 1. ติดตั้ง & ล็อกอิน
```bash
npm install
npm --prefix web install
npx wrangler login          # ครั้งแรกครั้งเดียว
```

## 2. สร้าง resource บน Cloudflare — ✅ ทำแล้ว
resource ถูกสร้างและใส่ id ใน `wrangler.toml` ให้แล้ว:
- D1 `pharm-regist-db` = `3421e58d-5b44-419b-84c6-e2788a5731bf` (APAC)
- KV `CONFIG` = `e9569f3d8fc043409c007f9aa518e6e5`
- R2 `pharm-regist-files`

> ถ้าต้องสร้างใหม่บนบัญชีอื่น:
> ```bash
> npx wrangler d1 create pharm-regist-db          # เอา id ใส่ wrangler.toml
> npx wrangler kv namespace create CONFIG          # เอา id ใส่ wrangler.toml
> npx wrangler r2 bucket create pharm-regist-files
> ```

## 3. ตั้ง Secrets
```bash
npx wrangler secret put JWT_SECRET        # สุ่มสตริงยาว ๆ เช่น `openssl rand -hex 32`
npx wrangler secret put RESEND_API_KEY    # API key จาก resend.com (re_...)
npx wrangler secret put MAIL_FROM         # อีเมลผู้ส่งที่ verify โดเมนแล้วใน Resend
```

## 4. Migrate ฐานข้อมูล + สร้าง admin — ✅ ทำแล้ว
schema ถูก migrate บน remote D1 แล้ว (ตาราง + index ครบ) และมี admin เริ่มต้น:
- **username:** `admin`  **password:** `Admin@1234`
- ⚠️ **เปลี่ยนรหัสผ่านทันทีหลัง deploy** (ยังไม่มีหน้าเปลี่ยนรหัสใน UI — ชั่วคราวเปลี่ยนได้ด้วย:
  `node scripts/genhash.mjs '<รหัสใหม่>'` แล้ว `wrangler d1 execute pharm-regist-db --remote --command "UPDATE users SET password_hash='<hash>' WHERE username='admin'"`)

> `wrangler d1 migrations apply --remote` จะรายงาน "no migrations to apply" เพราะบันทึก tracking ไว้แล้ว

## 5. Deploy
```bash
npm run deploy      # build web/ แล้ว wrangler deploy
```

## 6. ตั้งค่างานประชุม
ล็อกอิน `/admin/login` → เมนู **ตั้งค่า** → กรอกชื่องาน, วันที่, CPE, ค่าลงทะเบียน, ลิงก์ Zoom, กำหนดการ

## ข้อจำกัด Free Tier ที่ควรรู้
- **Resend**: 100 อีเมล/วัน (3,000/เดือน) — ถ้าผู้สมัครเยอะช่วงพีค อาจต้องอัปเกรด
- **Workers**: 100k req/วัน, CPU 10ms/req
- **D1**: เขียน 100k rows/วัน, อ่าน 5M/วัน
- **KV**: เขียน 1k/วัน (จึงใช้ in-memory rate-limit ไม่ใช่ KV)
- **R2**: 10GB, Class A 1M/เดือน
- **Worker bundle**: ~784 KiB gzip (ลิมิต 1 MiB) — ระวังเวลาเพิ่ม dependency ใหญ่
