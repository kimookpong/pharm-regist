import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, getToken } from "../../lib/api";
import { APPROVE_BADGE, baht, thaiDateTime } from "../../lib/format";

const PREFIXES = ["นาย", "นาง", "นางสาว", "ภก.", "ภญ.", "ดร.", "ผศ.", "รศ.", "ศ."];
const OCCUPATIONS = ["เภสัชกร", "แพทย์", "พยาบาล", "นักวิชาการ", "นักศึกษา", "อื่น ๆ"];

const EMAIL_TYPES = [
  { type: "confirm", label: "ยืนยันการลงทะเบียน" },
  { type: "approved", label: "อนุมัติ" },
  { type: "rejected", label: "ไม่อนุมัติ" },
  { type: "receipt", label: "ใบเสร็จ + Zoom" },
  { type: "zoom", label: "ลิงก์ Zoom" },
] as const;

const EMAIL_LABEL: Record<string, string> = {
  confirm: "ยืนยันการลงทะเบียน",
  slip_received: "แจ้งรับหลักฐาน",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
  receipt: "ใบเสร็จ",
  zoom: "ลิงก์ Zoom",
};

interface Detail {
  id: number;
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  license_no: string | null;
  position: string;
  workplace: string | null;
  work_address: string | null;
  receipt_name: string;
  receipt_address: string | null;
  receipt_type: string;
  postal_name: string | null;
  postal_address: string | null;
  postal_province: string | null;
  postal_zipcode: string | null;
  slip_filename: string | null;
  amount: number;
  payment_status: string;
  approve_status: string;
  reject_reason: string | null;
  created_at: string;
  receipt_no: string | null;
  receipt_issue_date: string | null;
}

interface EmailLog {
  type: string;
  status: string;
  error: string | null;
  created_at: string;
}

export default function RegistrationDetail() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(false);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  function load() {
    api.get<Detail>(`/api/admin/registrations/${id}`).then(setD).catch(() => setNotFound(true));
  }
  function loadEmails() {
    api.get<EmailLog[]>(`/api/admin/registrations/${id}/emails`).then(setEmails).catch(() => setEmails([]));
  }
  useEffect(() => {
    load();
    loadEmails();
  }, [id]);

  async function approve() {
    if (!confirm("ยืนยันการอนุมัติรายการนี้? ระบบจะส่งอีเมลแจ้งผู้สมัคร")) return;
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/approve`, {});
      load();
      loadEmails();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return setActionError("กรุณาระบุเหตุผล");
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/reject`, { reason });
      setShowReject(false);
      setReason("");
      load();
      loadEmails();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function issueReceipt(reissue = false) {
    const msg = reissue
      ? "ออกใบเสร็จใหม่? ใบเสร็จเลขเดิมจะถูกยกเลิก และออกเลขใหม่พร้อมส่งอีเมล"
      : "ออกใบเสร็จและส่งอีเมล (พร้อมลิงก์ Zoom) ให้ผู้สมัคร?";
    if (!confirm(msg)) return;
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/receipt${reissue ? "?reissue=1" : ""}`, {});
      load();
      loadEmails();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ออกใบเสร็จไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail(type: string) {
    if (!confirm(`ส่งอีเมล "${EMAIL_LABEL[type]}" ให้ผู้สมัครอีกครั้ง?`)) return;
    setSending(type);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/send-email`, { type });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "ส่งอีเมลไม่สำเร็จ");
    } finally {
      setSending(null);
      loadEmails();
    }
  }

  async function openFile(path: string) {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return alert("เปิดไฟล์ไม่สำเร็จ");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  const openSlip = (download = false) =>
    openFile(`/api/admin/registrations/${id}/slip${download ? "?download=1" : ""}`);

  if (notFound) return <p className="text-error">ไม่พบข้อมูล</p>;
  if (!d) return <p className="text-gray-500">กำลังโหลด…</p>;

  if (editing) {
    return <EditForm d={d} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />;
  }

  const badge = APPROVE_BADGE[d.approve_status];

  return (
    <div className="space-y-5">
      <Link to="/admin/registrations" className="text-primary text-sm hover:underline">
        ← กลับรายชื่อ
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">{d.reg_no}</h1>
        <span className="text-white text-xs px-3 py-1 rounded-full" style={{ background: badge.color }}>
          {badge.text}
        </span>
        <span className="text-sm text-gray-400">สมัครเมื่อ {thaiDateTime(d.created_at)}</span>
        <button onClick={() => setEditing(true)} className="ml-auto text-sm text-primary hover:underline font-medium">
          ✎ แก้ไขข้อมูล
        </button>
      </div>

      <Section title="ข้อมูลส่วนบุคคล">
        <Row k="ชื่อ" v={`${d.prefix}${d.first_name} ${d.last_name}`} />
        <Row k="เบอร์โทร" v={d.phone} />
        <Row k="อีเมล" v={d.email} />
        <Row k="อาชีพ" v={d.occupation} />
        {d.license_no && <Row k="เลขใบประกอบวิชาชีพ" v={d.license_no} />}
        <Row k="ตำแหน่ง" v={d.position} />
      </Section>

      <Section title="สถานที่ทำงาน">
        <Row k="ชื่อสถานที่" v={d.workplace ?? "-"} />
        <Row k="ที่อยู่" v={d.work_address ?? "-"} />
      </Section>

      <Section title="ใบเสร็จ">
        <Row k="ออกในนาม" v={d.receipt_name} />
        <Row k="ค่าลงทะเบียน" v={`${baht(d.amount)} ฿`} />
        <Row k="การรับใบเสร็จ" v={d.receipt_type === "post" ? "ส่งทางไปรษณีย์" : "PDF ทางอีเมล"} />
        {d.receipt_type === "post" && (
          <Row
            k="ที่อยู่จัดส่ง"
            v={`${d.postal_name ?? ""} ${d.postal_address ?? ""} ${d.postal_province ?? ""} ${d.postal_zipcode ?? ""}`}
          />
        )}
      </Section>

      <Section title="หลักฐานการชำระเงิน">
        {d.slip_filename ? (
          <div className="flex gap-3 items-center">
            <span className="text-gray-600">{d.slip_filename}</span>
            <button onClick={() => openSlip(false)} className="text-primary hover:underline text-sm">เปิดดู</button>
            <button onClick={() => openSlip(true)} className="text-primary hover:underline text-sm">ดาวน์โหลด</button>
          </div>
        ) : (
          <span className="text-gray-400">ไม่มีไฟล์</span>
        )}
      </Section>

      {d.approve_status === "rejected" && d.reject_reason && (
        <div className="card p-4 border-l-4" style={{ borderColor: "var(--color-error)" }}>
          <b className="text-error">เหตุผลที่ไม่อนุมัติ:</b> {d.reject_reason}
        </div>
      )}

      {/* การอนุมัติ (FR-04) */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">การอนุมัติ</h2>
        {actionError && <p className="field-error">{actionError}</p>}
        {!showReject ? (
          <div className="flex gap-3">
            <button onClick={approve} disabled={busy || d.approve_status === "approved"} className="btn-primary disabled:opacity-50">
              {d.approve_status === "approved" ? "อนุมัติแล้ว" : "อนุมัติ"}
            </button>
            <button onClick={() => setShowReject(true)} disabled={busy} className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: "var(--color-error)" }}>
              ไม่อนุมัติ
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="field-label">เหตุผลที่ไม่อนุมัติ (จะส่งให้ผู้สมัครทางอีเมล)</label>
            <textarea className="field-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={reject} disabled={busy} className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: "var(--color-error)" }}>
                {busy ? "กำลังบันทึก…" : "ยืนยันไม่อนุมัติ"}
              </button>
              <button onClick={() => { setShowReject(false); setReason(""); setActionError(""); }} className="px-5 py-2.5 rounded-xl border border-line">
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ใบเสร็จ (FR-05) */}
      {d.approve_status === "approved" && (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">ใบเสร็จรับเงิน</h2>
          {d.receipt_no ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-success)" }}>ออกแล้ว</span>
              <span className="font-medium">{d.receipt_no}</span>
              <button onClick={() => openFile(`/api/admin/registrations/${id}/receipt/pdf`)} className="text-primary hover:underline text-sm">เปิด PDF</button>
              <button onClick={() => openFile(`/api/admin/registrations/${id}/receipt/pdf?download=1`)} className="text-primary hover:underline text-sm">ดาวน์โหลด</button>
              <button onClick={() => issueReceipt(true)} disabled={busy} className="text-warning hover:underline text-sm ml-auto disabled:opacity-50">
                ออกใบเสร็จใหม่ (หลังแก้ข้อมูล)
              </button>
            </div>
          ) : (
            <button onClick={() => issueReceipt(false)} disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "กำลังออกใบเสร็จ…" : "ออกใบเสร็จ + ส่งอีเมล/Zoom"}
            </button>
          )}
        </section>
      )}

      {/* ส่งอีเมล manual + ประวัติ */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">ส่งอีเมล (ส่งซ้ำได้)</h2>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TYPES.map((e) => (
            <button
              key={e.type}
              onClick={() => sendEmail(e.type)}
              disabled={sending !== null}
              className="px-3 py-1.5 text-sm border border-primary text-primary rounded-lg hover:bg-bg disabled:opacity-50"
            >
              {sending === e.type ? "กำลังส่ง…" : e.label}
            </button>
          ))}
        </div>
        {emails.length > 0 ? (
          <table className="w-full text-sm mt-2">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="py-1 font-medium">ชนิด</th>
                <th className="py-1 font-medium">สถานะ</th>
                <th className="py-1 font-medium">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">{EMAIL_LABEL[e.type] ?? e.type}</td>
                  <td className="py-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: e.status === "sent" ? "var(--color-success)" : "var(--color-error)" }} title={e.error ?? ""}>
                      {e.status === "sent" ? "ส่งสำเร็จ" : "ล้มเหลว"}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-500">{thaiDateTime(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm">ยังไม่มีประวัติการส่งอีเมล</p>
        )}
      </section>
    </div>
  );
}

// ---------- ฟอร์มแก้ไข ----------
function EditForm({ d, onCancel, onSaved }: { d: Detail; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    prefix: d.prefix,
    first_name: d.first_name,
    last_name: d.last_name,
    phone: d.phone,
    email: d.email,
    occupation: d.occupation,
    license_no: d.license_no ?? "",
    position: d.position,
    workplace: d.workplace ?? "",
    work_address: d.work_address ?? "",
    receipt_name: d.receipt_name,
    receipt_address: d.receipt_address ?? "",
    receipt_type: d.receipt_type as "email" | "post",
    postal_name: d.postal_name ?? "",
    postal_address: d.postal_address ?? "",
    postal_province: d.postal_province ?? "",
    postal_zipcode: d.postal_zipcode ?? "",
  });
  const [feeBaht, setFeeBaht] = useState(String(d.amount / 100));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [topError, setTopError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTopError("");
    setErrors({});
    setSaving(true);
    try {
      await api.put(`/api/admin/registrations/${d.id}`, {
        ...f,
        license_no: f.license_no || null,
        amount: Math.round(parseFloat(feeBaht || "0") * 100),
      });
      onSaved();
    } catch (e2) {
      if (e2 instanceof ApiError) {
        setTopError(e2.message);
        if (e2.details) setErrors(e2.details);
      } else setTopError("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">แก้ไข {d.reg_no}</h1>
      </div>
      {topError && <p className="field-error">{topError}</p>}

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">ข้อมูลส่วนบุคคล</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <EF label="คำนำหน้า" error={err("prefix")}>
            <select className="field-input" value={f.prefix} onChange={(e) => set("prefix", e.target.value)}>
              {PREFIXES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </EF>
          <EF label="ชื่อ" error={err("first_name")}><input className="field-input" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></EF>
          <EF label="นามสกุล" error={err("last_name")}><input className="field-input" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></EF>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <EF label="เบอร์โทร" error={err("phone")}><input className="field-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></EF>
          <EF label="อีเมล" error={err("email")}><input className="field-input" value={f.email} onChange={(e) => set("email", e.target.value)} /></EF>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <EF label="อาชีพ" error={err("occupation")}>
            <select className="field-input" value={f.occupation} onChange={(e) => set("occupation", e.target.value)}>
              {OCCUPATIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </EF>
          <EF label="ตำแหน่ง" error={err("position")}><input className="field-input" value={f.position} onChange={(e) => set("position", e.target.value)} /></EF>
        </div>
        {f.occupation === "เภสัชกร" && (
          <EF label="เลขผู้ประกอบวิชาชีพเภสัชกรรม" error={err("license_no")}>
            <input className="field-input" value={f.license_no} onChange={(e) => set("license_no", e.target.value)} />
          </EF>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">สถานที่ทำงาน</h2>
        <EF label="ชื่อสถานที่ทำงาน"><input className="field-input" value={f.workplace} onChange={(e) => set("workplace", e.target.value)} /></EF>
        <EF label="ที่อยู่"><textarea className="field-input" rows={2} value={f.work_address} onChange={(e) => set("work_address", e.target.value)} /></EF>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">ใบเสร็จ / ค่าลงทะเบียน</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <EF label="ออกใบเสร็จในนาม" error={err("receipt_name")}><input className="field-input" value={f.receipt_name} onChange={(e) => set("receipt_name", e.target.value)} /></EF>
          <EF label="ค่าลงทะเบียน (บาท)"><input type="number" step="0.01" className="field-input" value={feeBaht} onChange={(e) => setFeeBaht(e.target.value)} /></EF>
        </div>
        <EF label="ที่อยู่ (สำหรับใบเสร็จ)"><textarea className="field-input" rows={2} value={f.receipt_address} onChange={(e) => set("receipt_address", e.target.value)} /></EF>
        <div>
          <span className="field-label">การรับใบเสร็จ</span>
          <label className="flex items-center gap-2"><input type="radio" checked={f.receipt_type === "email"} onChange={() => set("receipt_type", "email")} /> PDF ทางอีเมล</label>
          <label className="flex items-center gap-2"><input type="radio" checked={f.receipt_type === "post"} onChange={() => set("receipt_type", "post")} /> ส่งทางไปรษณีย์</label>
        </div>
        {f.receipt_type === "post" && (
          <div className="grid sm:grid-cols-2 gap-3 border-t border-line pt-3">
            <EF label="ชื่อผู้รับ" error={err("postal_name")}><input className="field-input" value={f.postal_name} onChange={(e) => set("postal_name", e.target.value)} /></EF>
            <EF label="จังหวัด" error={err("postal_province")}><input className="field-input" value={f.postal_province} onChange={(e) => set("postal_province", e.target.value)} /></EF>
            <EF label="ที่อยู่จัดส่ง" error={err("postal_address")}><textarea className="field-input" rows={2} value={f.postal_address} onChange={(e) => set("postal_address", e.target.value)} /></EF>
            <EF label="รหัสไปรษณีย์" error={err("postal_zipcode")}><input className="field-input" value={f.postal_zipcode} onChange={(e) => set("postal_zipcode", e.target.value)} /></EF>
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-line">ยกเลิก</button>
      </div>
    </form>
  );
}

function EF({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-40 shrink-0">{k}</span>
      <span className="text-gray-800">{v}</span>
    </div>
  );
}
