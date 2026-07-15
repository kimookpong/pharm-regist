import { useState } from "react";
import { api, ApiError } from "../lib/api";

const PREFIXES = ["นาย", "นาง", "นางสาว", "ภก.", "ภญ.", "ดร.", "ผศ.", "รศ.", "ศ."];
const OCCUPATIONS = ["เภสัชกร", "แพทย์", "พยาบาล", "นักวิชาการ", "นักศึกษา", "อื่น ๆ"];

interface FormState {
  prefix: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  license_no: string;
  position: string;
  workplace: string;
  work_address: string;
  receipt_name: string;
  receipt_address: string;
  receipt_type: "email" | "post";
  postal_name: string;
  postal_address: string;
  postal_province: string;
  postal_zipcode: string;
  accept_terms: boolean;
}

const initial: FormState = {
  prefix: "",
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  occupation: "",
  license_no: "",
  position: "",
  workplace: "",
  work_address: "",
  receipt_name: "",
  receipt_address: "",
  receipt_type: "email",
  postal_name: "",
  postal_address: "",
  postal_province: "",
  postal_zipcode: "",
  accept_terms: false,
};

export default function Register() {
  const [f, setF] = useState<FormState>(initial);
  const [slip, setSlip] = useState<{ key: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const set = (k: keyof FormState, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors((s) => ({ ...s, slip_key: ["ไฟล์ต้องไม่เกิน 10 MB"] }));
      return;
    }
    setUploading(true);
    setErrors((s) => ({ ...s, slip_key: [] }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post<{ slip_key: string; slip_filename: string }>("/api/upload", fd);
      setSlip({ key: r.slip_key, filename: r.slip_filename });
    } catch (err) {
      setErrors((s) => ({ ...s, slip_key: [err instanceof ApiError ? err.message : "อัพโหลดล้มเหลว"] }));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError("");
    setErrors({});
    if (!slip) {
      setErrors({ slip_key: ["กรุณาแนบหลักฐานการชำระเงิน"] });
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post<{ reg_no: string }>("/api/register", {
        ...f,
        license_no: f.license_no || null,
        slip_key: slip.key,
        slip_filename: slip.filename,
      });
      setDone(r.reg_no);
    } catch (err) {
      if (err instanceof ApiError) {
        setTopError(err.message);
        if (err.details) setErrors(err.details);
      } else {
        setTopError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <div className="text-success text-5xl mb-3">✓</div>
        <h2 className="text-xl font-bold mb-2">ลงทะเบียนสำเร็จ</h2>
        <p className="text-gray-600">หมายเลขลงทะเบียนของท่านคือ</p>
        <p className="text-2xl font-bold text-primary my-2">{done}</p>
        <p className="text-sm text-gray-500">
          ระบบได้ส่งอีเมลยืนยันแล้ว เจ้าหน้าที่จะตรวจสอบหลักฐานและแจ้งผลอีกครั้ง
        </p>
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">แบบฟอร์มลงทะเบียน</h1>
      {topError && (
        <div className="card p-3 border-error text-error" style={{ borderColor: "var(--color-error)" }}>
          {topError}
        </div>
      )}

      {/* ข้อมูลส่วนบุคคล */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">ข้อมูลส่วนบุคคล</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="คำนำหน้า" required error={err("prefix")}>
            <select className="field-input" value={f.prefix} onChange={(e) => set("prefix", e.target.value)}>
              <option value="">— เลือก —</option>
              {PREFIXES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="ชื่อ" required error={err("first_name")}>
            <input className="field-input" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </Field>
          <Field label="นามสกุล" required error={err("last_name")}>
            <input className="field-input" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="เบอร์โทรศัพท์" required error={err("phone")}>
            <input className="field-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email" required error={err("email")}>
            <input type="email" className="field-input" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="อาชีพ" required error={err("occupation")}>
            <select className="field-input" value={f.occupation} onChange={(e) => set("occupation", e.target.value)}>
              <option value="">— เลือก —</option>
              {OCCUPATIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="ตำแหน่ง" required error={err("position")}>
            <input className="field-input" value={f.position} onChange={(e) => set("position", e.target.value)} />
          </Field>
        </div>
        {f.occupation === "เภสัชกร" && (
          <Field label="เลขผู้ประกอบวิชาชีพเภสัชกรรม" required error={err("license_no")}>
            <input className="field-input" value={f.license_no} onChange={(e) => set("license_no", e.target.value)} />
          </Field>
        )}
      </section>

      {/* สถานที่ทำงาน */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">ข้อมูลสถานที่ทำงาน</h2>
        <Field label="ชื่อสถานที่ทำงาน" error={err("workplace")}>
          <input className="field-input" value={f.workplace} onChange={(e) => set("workplace", e.target.value)} />
        </Field>
        <Field label="ที่อยู่สถานที่ทำงาน" error={err("work_address")}>
          <textarea className="field-input" rows={2} value={f.work_address} onChange={(e) => set("work_address", e.target.value)} />
        </Field>
      </section>

      {/* การชำระเงิน */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">การชำระเงิน</h2>
        <Field label="หลักฐานการโอน (PDF, JPG, PNG ไม่เกิน 10 MB)" required error={err("slip_key")}>
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={onFile} />
          {uploading && <p className="text-sm text-gray-500 mt-1">กำลังอัพโหลด…</p>}
          {slip && <p className="text-sm text-success mt-1">✓ แนบแล้ว: {slip.filename}</p>}
        </Field>
      </section>

      {/* ใบเสร็จ */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">การออกใบเสร็จ</h2>
        <Field label="ออกใบเสร็จในนาม" required error={err("receipt_name")}>
          <input className="field-input" value={f.receipt_name} onChange={(e) => set("receipt_name", e.target.value)} />
        </Field>
        <Field label="ที่อยู่ (สำหรับใบเสร็จ)" error={err("receipt_address")}>
          <textarea className="field-input" rows={2} value={f.receipt_address} onChange={(e) => set("receipt_address", e.target.value)} />
        </Field>
        <div>
          <span className="field-label">การรับใบเสร็จ</span>
          <label className="flex items-center gap-2 mb-1">
            <input type="radio" checked={f.receipt_type === "email"} onChange={() => set("receipt_type", "email")} />
            รับเป็นไฟล์ PDF ผ่าน Email
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={f.receipt_type === "post"} onChange={() => set("receipt_type", "post")} />
            ส่งทางไปรษณีย์
          </label>
        </div>
        {f.receipt_type === "post" && (
          <div className="grid sm:grid-cols-2 gap-3 border-t border-line pt-3">
            <Field label="ชื่อผู้รับ" required error={err("postal_name")}>
              <input className="field-input" value={f.postal_name} onChange={(e) => set("postal_name", e.target.value)} />
            </Field>
            <Field label="จังหวัด" required error={err("postal_province")}>
              <input className="field-input" value={f.postal_province} onChange={(e) => set("postal_province", e.target.value)} />
            </Field>
            <Field label="ที่อยู่จัดส่ง" required error={err("postal_address")}>
              <textarea className="field-input" rows={2} value={f.postal_address} onChange={(e) => set("postal_address", e.target.value)} />
            </Field>
            <Field label="รหัสไปรษณีย์" required error={err("postal_zipcode")}>
              <input className="field-input" value={f.postal_zipcode} onChange={(e) => set("postal_zipcode", e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={f.accept_terms} onChange={(e) => set("accept_terms", e.target.checked)} />
        ยอมรับเงื่อนไขการสมัคร
      </label>
      {err("accept_terms") && <p className="field-error">{err("accept_terms")}</p>}

      <button type="submit" className="btn-primary w-full" disabled={submitting || uploading || !f.accept_terms}>
        {submitting ? "กำลังบันทึก…" : "ลงทะเบียน"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
