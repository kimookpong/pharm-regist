import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getToken } from "../../lib/api";
import { APPROVE_BADGE, baht, thaiDateTime } from "../../lib/format";

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

export default function RegistrationDetail() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");

  function load() {
    api
      .get<Detail>(`/api/admin/registrations/${id}`)
      .then(setD)
      .catch(() => setNotFound(true));
  }
  useEffect(load, [id]);

  async function approve() {
    if (!confirm("ยืนยันการอนุมัติรายการนี้? ระบบจะส่งอีเมลแจ้งผู้สมัคร")) return;
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/approve`, {});
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setActionError("กรุณาระบุเหตุผล");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/reject`, { reason });
      setShowReject(false);
      setReason("");
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) return <p className="text-error">ไม่พบข้อมูล</p>;
  if (!d) return <p className="text-gray-500">กำลังโหลด…</p>;

  const badge = APPROVE_BADGE[d.approve_status];
  // slip ต้องแนบ token → เปิดผ่าน fetch ไม่ได้ตรง ๆ ด้วย <a>; ใช้ query token ชั่วคราวไม่ปลอดภัย
  // จึงเปิดด้วยการ fetch blob แล้ว open (ดู openSlip)
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

  async function issueReceipt() {
    if (!confirm("ออกใบเสร็จและส่งอีเมล (พร้อมลิงก์ Zoom) ให้ผู้สมัคร?")) return;
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/api/admin/registrations/${id}/receipt`, {});
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ออกใบเสร็จไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

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
            <button onClick={() => openSlip(false)} className="text-primary hover:underline text-sm">
              เปิดดู
            </button>
            <button onClick={() => openSlip(true)} className="text-primary hover:underline text-sm">
              ดาวน์โหลด
            </button>
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

      {/* การตัดสิน (FR-04) */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">การอนุมัติ</h2>
        {actionError && <p className="field-error">{actionError}</p>}
        {!showReject ? (
          <div className="flex gap-3">
            <button
              onClick={approve}
              disabled={busy || d.approve_status === "approved"}
              className="btn-primary disabled:opacity-50"
            >
              {d.approve_status === "approved" ? "อนุมัติแล้ว" : "อนุมัติ"}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--color-error)" }}
            >
              ไม่อนุมัติ
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="field-label">เหตุผลที่ไม่อนุมัติ (จะส่งให้ผู้สมัครทางอีเมล)</label>
            <textarea
              className="field-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={reject}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--color-error)" }}
              >
                {busy ? "กำลังบันทึก…" : "ยืนยันไม่อนุมัติ"}
              </button>
              <button
                onClick={() => {
                  setShowReject(false);
                  setReason("");
                  setActionError("");
                }}
                className="px-5 py-2.5 rounded-xl border border-line"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ใบเสร็จ (FR-05) — ออกได้หลังอนุมัติ */}
      {d.approve_status === "approved" && (
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">ใบเสร็จรับเงิน</h2>
          {d.receipt_no ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-success)" }}>
                ออกแล้ว
              </span>
              <span className="font-medium">{d.receipt_no}</span>
              <button
                onClick={() => openFile(`/api/admin/registrations/${id}/receipt/pdf`)}
                className="text-primary hover:underline text-sm"
              >
                เปิด PDF
              </button>
              <button
                onClick={() => openFile(`/api/admin/registrations/${id}/receipt/pdf?download=1`)}
                className="text-primary hover:underline text-sm"
              >
                ดาวน์โหลด
              </button>
            </div>
          ) : (
            <button onClick={issueReceipt} disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "กำลังออกใบเสร็จ…" : "ออกใบเสร็จ + ส่งอีเมล/Zoom"}
            </button>
          )}
        </section>
      )}
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
