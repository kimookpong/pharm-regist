import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { baht } from "../../lib/format";

interface Group {
  k: string;
  n: number;
}
interface ReportData {
  totals: { total: number; pharmacists: number; approved: number; revenue: number };
  byOccupation: Group[];
  byProvince: Group[];
  byReceiptType: Group[];
}

export default function Reports() {
  const [d, setD] = useState<ReportData | null>(null);

  useEffect(() => {
    api.get<ReportData>("/api/admin/reports").then(setD).catch(() => setD(null));
  }, []);

  if (!d) return <p className="text-gray-500">กำลังโหลด…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">รายงาน</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="ผู้สมัครทั้งหมด" value={d.totals.total} />
        <Tile label="เภสัชกร" value={d.totals.pharmacists} />
        <Tile label="อนุมัติแล้ว" value={d.totals.approved} />
        <Tile label="รายได้ (บาท)" value={baht(d.totals.revenue)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <BarCard title="แยกตามอาชีพ" groups={d.byOccupation} total={d.totals.total} />
        <BarCard title="แยกตามวิธีรับใบเสร็จ" groups={d.byReceiptType} total={d.totals.total} />
        <BarCard title="แยกตามจังหวัด" groups={d.byProvince} total={d.totals.total} />
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-primary mt-1">{value}</div>
    </div>
  );
}

function BarCard({ title, groups, total }: { title: string; groups: Group[]; total: number }) {
  const max = Math.max(1, ...groups.map((g) => g.n));
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">ไม่มีข้อมูล</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.k}>
              <div className="flex justify-between text-sm mb-0.5">
                <span>{g.k}</span>
                <span className="text-gray-500">
                  {g.n} ({total ? Math.round((g.n / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${(g.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
