import { useState } from "react";
import { api, ApiError } from "../lib/api";

interface StatusResult {
  reg_no: string;
  first_name: string;
  last_name: string;
  payment_status: string;
  approve_status: string;
  reject_reason: string | null;
  created_at: string;
}

const APPROVE_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "รอตรวจสอบ", color: "var(--color-warning)" },
  approved: { text: "อนุมัติแล้ว", color: "var(--color-success)" },
  rejected: { text: "ไม่อนุมัติ", color: "var(--color-error)" },
};

export default function Status() {
  const [regNo, setRegNo] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await api.get<StatusResult>(
        `/api/status?reg_no=${encodeURIComponent(regNo)}&email=${encodeURIComponent(email)}`,
      );
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const st = result ? APPROVE_LABEL[result.approve_status] : null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-bold">ตรวจสอบสถานะการลงทะเบียน</h1>
      <form onSubmit={onSearch} className="card p-5 space-y-3">
        <div>
          <label className="field-label">หมายเลขลงทะเบียน</label>
          <input className="field-input" placeholder="REG-2026-00001" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
        </div>
        <div>
          <label className="field-label">อีเมลที่ใช้ลงทะเบียน</label>
          <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "กำลังค้นหา…" : "ตรวจสอบ"}
        </button>
        {error && <p className="field-error">{error}</p>}
      </form>

      {result && st && (
        <div className="card p-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">หมายเลข</span>
            <span className="font-medium">{result.reg_no}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ชื่อ</span>
            <span>{result.first_name} {result.last_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">สถานะ</span>
            <span className="font-semibold px-3 py-1 rounded-full text-white text-sm" style={{ background: st.color }}>
              {st.text}
            </span>
          </div>
          {result.approve_status === "rejected" && result.reject_reason && (
            <p className="text-sm text-error border-t border-line pt-2">เหตุผล: {result.reject_reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
