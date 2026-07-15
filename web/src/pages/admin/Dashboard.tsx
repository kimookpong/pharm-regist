import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { baht } from "../../lib/format";

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revenue: number;
  receipts: number;
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/admin/stats").then(setS).catch(() => setS(null));
  }, []);

  if (!s) return <p className="text-gray-500">กำลังโหลด…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">ภาพรวม</h1>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="ผู้สมัครทั้งหมด" value={s.total} />
        <StatCard label="รออนุมัติ" value={s.pending} color="var(--color-warning)" />
        <StatCard label="อนุมัติแล้ว" value={s.approved} color="var(--color-success)" />
        <StatCard label="ไม่อนุมัติ" value={s.rejected} color="var(--color-error)" />
        <StatCard label="ใบเสร็จที่ออก" value={s.receipts} />
        <StatCard label="รายได้ (อนุมัติแล้ว)" value={`${baht(s.revenue)} ฿`} color="var(--color-primary)" />
      </div>
      <div className="flex gap-3">
        <Link to="/admin/registrations?status=pending" className="btn-primary">
          ตรวจรายการรออนุมัติ ({s.pending})
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: color ?? "#263238" }}>
        {value}
      </div>
    </div>
  );
}
