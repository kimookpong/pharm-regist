import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, downloadFile } from "../../lib/api";
import { APPROVE_BADGE, baht, thaiDateTime } from "../../lib/format";

interface Row {
  id: number;
  reg_no: string;
  prefix: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occupation: string;
  amount: number;
  approve_status: string;
  created_at: string;
}
interface ListResp {
  data: Row[];
  page: number;
  pages: number;
  total: number;
}

export default function Registrations() {
  const [params, setParams] = useSearchParams();
  const [resp, setResp] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");

  const status = params.get("status") ?? "";
  const page = parseInt(params.get("page") ?? "1", 10);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.get("q")) qs.set("q", params.get("q")!);
    if (status) qs.set("status", status);
    qs.set("page", String(page));
    api
      .get<ListResp>(`/api/admin/registrations?${qs}`)
      .then(setResp)
      .finally(() => setLoading(false));
  }, [params, status, page]);

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!("page" in next)) p.set("page", "1"); // เปลี่ยนตัวกรอง → กลับหน้า 1
    setParams(p);
  }

  function exportUrl(fmt: string) {
    const p = new URLSearchParams();
    if (params.get("q")) p.set("q", params.get("q")!);
    if (status) p.set("status", status);
    const qs = p.toString();
    return `/api/admin/export/${fmt}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">รายชื่อผู้สมัคร</h1>
        <div className="flex gap-2 text-sm">
          <span className="text-gray-400 self-center">Export:</span>
          {(["csv", "xlsx", "pdf"] as const).map((f) => (
            <button
              key={f}
              onClick={() => downloadFile(exportUrl(f), `registrations.${f}`)}
              className="px-3 py-1 border border-line rounded-lg hover:bg-bg uppercase"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ค้นหา + กรอง */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q });
          }}
        >
          <label className="field-label">ค้นหา (ชื่อ / อีเมล / เบอร์ / เลขลงทะเบียน)</label>
          <div className="flex gap-2">
            <input className="field-input" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary shrink-0">ค้นหา</button>
          </div>
        </form>
        <div>
          <label className="field-label">สถานะ</label>
          <select className="field-input" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">ทั้งหมด</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ไม่อนุมัติ</option>
          </select>
        </div>
      </div>

      {/* ตาราง */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">เลขลงทะเบียน</th>
              <th className="px-3 py-2">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2">อาชีพ</th>
              <th className="px-3 py-2 text-right">ค่าลงทะเบียน</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && resp?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {!loading &&
              resp?.data.map((r) => {
                const b = APPROVE_BADGE[r.approve_status];
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-bg">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/admin/registrations/${r.id}`} className="text-primary hover:underline">
                        {r.reg_no}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {r.prefix}
                      {r.first_name} {r.last_name}
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </td>
                    <td className="px-3 py-2">{r.occupation}</td>
                    <td className="px-3 py-2 text-right">{baht(r.amount)}</td>
                    <td className="px-3 py-2">
                      <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ background: b.color }}>
                        {b.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{thaiDateTime(r.created_at)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* แบ่งหน้า */}
      {resp && resp.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            ทั้งหมด {resp.total} รายการ · หน้า {resp.page}/{resp.pages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-line rounded-lg disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              ก่อนหน้า
            </button>
            <button
              className="px-3 py-1 border border-line rounded-lg disabled:opacity-40"
              disabled={page >= resp.pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
