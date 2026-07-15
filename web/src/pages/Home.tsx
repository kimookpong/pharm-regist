import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface EventInfo {
  title: string;
  banner: string;
  detail: string;
  event_date: string;
  cpe: number;
  activity_code: string;
  agenda: Array<{ time: string; topic: string }>;
  contact: string;
  fee: number;
  register_open: boolean;
}

export default function Home() {
  const [ev, setEv] = useState<EventInfo | null>(null);

  useEffect(() => {
    api.get<EventInfo>("/api/event").then(setEv).catch(() => setEv(null));
  }, []);

  if (!ev) return <p className="text-center text-gray-500 py-10">กำลังโหลด…</p>;

  return (
    <div className="space-y-6">
      {/* Banner (FR-01) */}
      <div className="card overflow-hidden">
        {ev.banner ? (
          <img src={ev.banner} alt={ev.title} className="w-full max-h-72 object-cover" />
        ) : (
          <div className="bg-primary text-white p-8 text-center">
            <h1 className="text-2xl font-bold">{ev.title}</h1>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoTile label="วันที่จัดงาน" value={ev.event_date || "-"} />
        <InfoTile label="จำนวน CPE" value={ev.cpe ? `${ev.cpe} หน่วย` : "-"} />
        <InfoTile label="รหัสกิจกรรม" value={ev.activity_code || "-"} />
      </div>

      {ev.detail && (
        <section className="card p-5">
          <h2 className="font-semibold mb-2">รายละเอียดงาน</h2>
          <p className="whitespace-pre-wrap text-gray-700">{ev.detail}</p>
        </section>
      )}

      {ev.agenda?.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3">กำหนดการ</h2>
          <ul className="divide-y divide-line">
            {ev.agenda.map((a, i) => (
              <li key={i} className="flex gap-4 py-2">
                <span className="text-primary font-medium w-28 shrink-0">{a.time}</span>
                <span className="text-gray-700">{a.topic}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="text-center flex flex-col sm:flex-row gap-3 justify-center items-center">
        {ev.register_open ? (
          <Link to="/register" className="btn-primary inline-block">
            ลงทะเบียนเข้าร่วม
          </Link>
        ) : (
          <p className="text-warning font-medium">ปิดรับลงทะเบียนแล้ว</p>
        )}
        <Link
          to="/status"
          className="inline-block px-5 py-2.5 rounded-xl font-semibold border border-primary text-primary hover:bg-bg"
        >
          ตรวจสอบสถานะการลงทะเบียน
        </Link>
      </div>

      {ev.contact && (
        <p className="text-center text-sm text-gray-500">ติดต่อสอบถาม: {ev.contact}</p>
      )}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-primary mt-1">{value}</div>
    </div>
  );
}
