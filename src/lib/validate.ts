import { z } from "zod";

// เบอร์โทรไทย: 9-10 หลัก (อนุญาตเว้นวรรค/ขีดตอนกรอก แล้วค่อย normalize)
const phoneRegex = /^[0-9]{9,10}$/;

export const registrationSchema = z
  .object({
    prefix: z.string().min(1, "กรุณาเลือกคำนำหน้า"),
    first_name: z.string().min(1, "กรุณากรอกชื่อ").max(100),
    last_name: z.string().min(1, "กรุณากรอกนามสกุล").max(100),
    phone: z
      .string()
      .transform((s) => s.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง")),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").max(200),
    occupation: z.string().min(1, "กรุณาเลือกอาชีพ"),
    license_no: z.string().max(50).optional().nullable(),
    position: z.string().min(1, "กรุณากรอกตำแหน่ง").max(100),
    workplace: z.string().max(200).optional().nullable(),
    work_address: z.string().max(500).optional().nullable(),
    // ใบเสร็จ
    receipt_name: z.string().min(1, "กรุณากรอกชื่อสำหรับออกใบเสร็จ").max(200),
    receipt_address: z.string().max(500).optional().nullable(),
    receipt_type: z.enum(["email", "post"]),
    postal_name: z.string().max(200).optional().nullable(),
    postal_address: z.string().max(500).optional().nullable(),
    postal_province: z.string().max(100).optional().nullable(),
    postal_zipcode: z.string().max(10).optional().nullable(),
    // หลักฐาน (key ที่ได้จาก /api/upload)
    slip_key: z.string().min(1, "กรุณาแนบหลักฐานการชำระเงิน"),
    slip_filename: z.string().min(1),
    accept_terms: z.literal(true, {
      errorMap: () => ({ message: "กรุณายอมรับเงื่อนไขการสมัคร" }),
    }),
    turnstile_token: z.string().optional().nullable(), // Cloudflare Turnstile (ตรวจฝั่ง server)
  })
  // อาชีพเภสัชกร ต้องมีเลขใบประกอบวิชาชีพ
  .refine((d) => d.occupation !== "เภสัชกร" || (d.license_no && d.license_no.trim().length > 0), {
    message: "กรุณากรอกเลขผู้ประกอบวิชาชีพเภสัชกรรม",
    path: ["license_no"],
  })
  // เลือกส่งไปรษณีย์ ต้องกรอกที่อยู่จัดส่งครบ
  .refine(
    (d) =>
      d.receipt_type !== "post" ||
      (d.postal_name && d.postal_address && d.postal_province && d.postal_zipcode),
    { message: "กรุณากรอกข้อมูลจัดส่งไปรษณีย์ให้ครบ", path: ["postal_address"] },
  );

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// แก้ไขข้อมูลลงทะเบียนโดย admin (ไม่รวม slip/สถานะ; amount เป็นสตางค์)
export const adminEditSchema = z
  .object({
    prefix: z.string().min(1).max(20),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone: z
      .string()
      .transform((s) => s.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(phoneRegex, "เบอร์โทรไม่ถูกต้อง")),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").max(200),
    occupation: z.string().min(1).max(100),
    license_no: z.string().max(50).optional().nullable(),
    position: z.string().min(1).max(100),
    workplace: z.string().max(200).optional().nullable(),
    work_address: z.string().max(500).optional().nullable(),
    receipt_name: z.string().min(1).max(200),
    receipt_address: z.string().max(500).optional().nullable(),
    receipt_type: z.enum(["email", "post"]),
    postal_name: z.string().max(200).optional().nullable(),
    postal_address: z.string().max(500).optional().nullable(),
    postal_province: z.string().max(100).optional().nullable(),
    postal_zipcode: z.string().max(10).optional().nullable(),
    amount: z.number().int().min(0), // สตางค์
  })
  .refine((d) => d.occupation !== "เภสัชกร" || (d.license_no && d.license_no.trim().length > 0), {
    message: "กรุณากรอกเลขผู้ประกอบวิชาชีพเภสัชกรรม",
    path: ["license_no"],
  })
  .refine(
    (d) =>
      d.receipt_type !== "post" ||
      (d.postal_name && d.postal_address && d.postal_province && d.postal_zipcode),
    { message: "กรุณากรอกข้อมูลจัดส่งไปรษณีย์ให้ครบ", path: ["postal_address"] },
  );

export type AdminEditInput = z.infer<typeof adminEditSchema>;
