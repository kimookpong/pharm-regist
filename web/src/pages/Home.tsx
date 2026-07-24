import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Speaker {
  name: string;
  title: string;
  affiliation: string;
  license_no?: string;
  expertise?: string;
  topic?: string;
  photo_key?: string;
}

function speakerPhotoUrl(key?: string): string {
  if (!key) return "";
  if (key.startsWith("http")) return key;
  const name = key.replace(/^speakers\//, "");
  return `/api/files/speakers/${name}`;
}

interface EventInfo {
  title: string;
  subtitle_en: string;
  subtitle_th: string;
  banner: string;
  organizer: string;
  venue: string;
  detail: string;
  event_date: string;
  cpe: number;
  activity_code: string;
  agenda: Array<{ time: string; topic: string }>;
  speakers: Speaker[];
  objectives: string[];
  keywords: string[];
  target_audience: string;
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

  const feeBaht = ev.fee > 0 ? (ev.fee / 100).toLocaleString("th-TH") : "ไม่มีค่าลงทะเบียน";

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="hero p-8 sm:p-10">
        <div className="hero-inner max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="pill bg-white/15 text-white border border-white/30">
              <IconCal className="w-3.5 h-3.5" />
              {ev.event_date || "จะประกาศให้ทราบ"}
            </span>
            <span className="pill bg-white/15 text-white border border-white/30">
              <IconZoom className="w-3.5 h-3.5" />
              {ev.venue || "ออนไลน์"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug">{ev.title}</h1>
          {ev.subtitle_en && (
            <p className="mt-3 text-lg font-medium text-white/95">{ev.subtitle_en}</p>
          )}
          {ev.subtitle_th && <p className="mt-1 text-white/85">{ev.subtitle_th}</p>}
          {ev.organizer && (
            <p className="mt-4 text-sm text-white/80">จัดโดย {ev.organizer}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {ev.register_open ? (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-5 py-2.5 rounded-xl shadow hover:shadow-lg transition-shadow"
              >
                ลงทะเบียนเข้าร่วม
                <IconArrow className="w-4 h-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl border border-white/40">
                ปิดรับลงทะเบียนแล้ว
              </span>
            )}
            <Link
              to="/status"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/40 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
            >
              ตรวจสอบสถานะ
            </Link>
          </div>
        </div>
      </section>

      {/* Banner image (ถ้ามี) */}
      {ev.banner && (
        <div className="card overflow-hidden">
          <img src={ev.banner} alt={ev.title} className="w-full max-h-80 object-cover" />
        </div>
      )}

      {/* Info tiles */}
      <div className="grid gap-4 sm:grid-cols-4">
        <InfoTile icon={<IconCal />} label="วันที่จัดงาน" value={ev.event_date || "-"} />
        <InfoTile icon={<IconCpe />} label="จำนวน CPE" value={ev.cpe ? `${ev.cpe} หน่วย` : "รอประกาศ"} />
        <InfoTile icon={<IconCode />} label="รหัสกิจกรรม" value={ev.activity_code || "รอประกาศ"} />
        <InfoTile icon={<IconMoney />} label="ค่าลงทะเบียน" value={feeBaht + (ev.fee > 0 ? " บาท" : "")} />
      </div>

      {/* Keywords */}
      {ev.keywords?.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <IconTag className="w-4 h-4 text-primary" />
            คำสำคัญ
          </h2>
          <div className="flex flex-wrap gap-2">
            {ev.keywords.map((k) => (
              <span key={k} className="pill pill-accent">
                {k}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Detail */}
      {ev.detail && (
        <section className="card p-6">
          <h2 className="font-semibold mb-2 text-lg">รายละเอียดงาน</h2>
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{ev.detail}</p>
        </section>
      )}

      {/* Objectives */}
      {ev.objectives?.length > 0 && (
        <section className="card p-6">
          <h2 className="font-semibold mb-3 text-lg">วัตถุประสงค์</h2>
          <ul className="space-y-2">
            {ev.objectives.map((o, i) => (
              <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                <span
                  className="mt-1 shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-semibold"
                  style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}
                >
                  {i + 1}
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Agenda timeline */}
      {ev.agenda?.length > 0 && (
        <section className="card p-6">
          <h2 className="font-semibold mb-4 text-lg">กำหนดการ</h2>
          <ol className="timeline">
            {ev.agenda.map((a, i) => (
              <li key={i} className="timeline-item">
                <div className="text-sm font-semibold text-primary">{a.time}</div>
                <div className="text-gray-800 mt-0.5 leading-relaxed">{a.topic}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Speakers */}
      {ev.speakers?.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 text-lg">วิทยากร</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ev.speakers.map((sp, i) => {
              const photo = speakerPhotoUrl(sp.photo_key);
              return (
              <div key={i} className="card card-hover p-5">
                <div className="flex items-start gap-4">
                  {photo ? (
                    <img
                      src={photo}
                      alt={sp.name}
                      loading="lazy"
                      className="w-16 h-16 rounded-full object-cover shrink-0 border border-line"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full grid place-items-center text-white font-semibold text-lg shrink-0"
                      style={{ background: "var(--color-primary)" }}
                      aria-hidden
                    >
                      {sp.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 leading-tight">{sp.name}</div>
                    {sp.title && <div className="text-sm text-gray-600 mt-0.5">{sp.title}</div>}
                    {sp.affiliation && (
                      <div className="text-sm text-gray-500 mt-0.5">{sp.affiliation}</div>
                    )}
                  </div>
                </div>
                {sp.expertise && (
                  <p className="text-sm text-gray-600 mt-3">
                    <span className="text-gray-500">ความเชี่ยวชาญ: </span>
                    {sp.expertise}
                  </p>
                )}
                {sp.topic && (
                  <div
                    className="mt-3 p-3 rounded-lg text-sm text-gray-700"
                    style={{ background: "var(--color-primary-soft)" }}
                  >
                    <div className="text-xs font-semibold text-primary mb-0.5">หัวข้อบรรยาย</div>
                    {sp.topic}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {sp.license_no && <span className="pill pill-outline">ใบประกอบ {sp.license_no}</span>}
                </div>
              </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Target audience */}
      {ev.target_audience && (
        <section className="card p-5 flex items-start gap-3">
          <IconUsers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-gray-800">กลุ่มเป้าหมาย</div>
            <p className="text-gray-600 text-sm mt-0.5">{ev.target_audience}</p>
          </div>
        </section>
      )}

      {/* CTA + contact */}
      <div className="text-center space-y-3 py-4">
        {ev.register_open ? (
          <Link to="/register" className="btn-primary inline-flex items-center gap-2">
            ลงทะเบียนเข้าร่วม
            <IconArrow className="w-4 h-4" />
          </Link>
        ) : (
          <p className="text-warning font-medium">ปิดรับลงทะเบียนแล้ว</p>
        )}
        {ev.contact && (
          <p className="text-sm text-gray-500">ติดต่อสอบถาม: {ev.contact}</p>
        )}
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="font-semibold text-gray-900 text-sm leading-snug">{value}</div>
    </div>
  );
}

/* ---- inline icons (24×24 by default; sized via className) ---- */
function IconCal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconZoom(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-6 4 6 4V8z" />
    </svg>
  );
}
function IconCpe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}
function IconCode(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}
function IconMoney(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function IconTag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.58z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconArrow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
