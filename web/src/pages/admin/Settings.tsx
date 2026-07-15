import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

interface EventCfg {
  title: string;
  banner: string;
  detail: string;
  event_date: string;
  cpe: number;
  activity_code: string;
  agenda: Array<{ time: string; topic: string }>;
  contact: string;
  fee: number; // สตางค์
  zoom_link: string;
  register_open: boolean;
}

export default function Settings() {
  const [cfg, setCfg] = useState<EventCfg | null>(null);
  const [feeBaht, setFeeBaht] = useState("0");
  const [agendaText, setAgendaText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<EventCfg>("/api/admin/settings").then((c) => {
      setCfg(c);
      setFeeBaht(String(c.fee / 100));
      setAgendaText(c.agenda.map((a) => `${a.time} | ${a.topic}`).join("\n"));
    });
  }, []);

  if (!cfg) return <p className="text-gray-500">กำลังโหลด…</p>;

  const set = <K extends keyof EventCfg>(k: K, v: EventCfg[K]) => setCfg({ ...cfg, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setMsg("");
    setErr("");
    setSaving(true);
    const agenda = agendaText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [time, ...rest] = l.split("|");
        return { time: time.trim(), topic: rest.join("|").trim() };
      });
    try {
      await api.put("/api/admin/settings", {
        ...cfg,
        fee: Math.round(parseFloat(feeBaht || "0") * 100),
        cpe: Number(cfg.cpe) || 0,
        agenda,
      });
      setMsg("บันทึกเรียบร้อย");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "บันทึกไม่สำเร็จ (ต้องเป็นสิทธิ์ผู้ดูแลระบบ)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">ตั้งค่างานประชุม</h1>
      {msg && <div className="card p-3 text-success border-l-4" style={{ borderColor: "var(--color-success)" }}>{msg}</div>}
      {err && <p className="field-error">{err}</p>}

      <section className="card p-5 space-y-4">
        <F label="ชื่องานประชุม">
          <input className="field-input" value={cfg.title} onChange={(e) => set("title", e.target.value)} />
        </F>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="วันที่จัดงาน">
            <input className="field-input" value={cfg.event_date} onChange={(e) => set("event_date", e.target.value)} placeholder="15 สิงหาคม 2569" />
          </F>
          <F label="รหัสกิจกรรม">
            <input className="field-input" value={cfg.activity_code} onChange={(e) => set("activity_code", e.target.value)} />
          </F>
          <F label="จำนวน CPE">
            <input type="number" className="field-input" value={cfg.cpe} onChange={(e) => set("cpe", Number(e.target.value))} />
          </F>
          <F label="ค่าลงทะเบียน (บาท)">
            <input type="number" step="0.01" className="field-input" value={feeBaht} onChange={(e) => setFeeBaht(e.target.value)} />
          </F>
        </div>
        <F label="รายละเอียดงาน">
          <textarea className="field-input" rows={3} value={cfg.detail} onChange={(e) => set("detail", e.target.value)} />
        </F>
        <F label="URL รูป Banner">
          <input className="field-input" value={cfg.banner} onChange={(e) => set("banner", e.target.value)} />
        </F>
        <F label="ช่องทางติดต่อ">
          <input className="field-input" value={cfg.contact} onChange={(e) => set("contact", e.target.value)} />
        </F>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">กำหนดการ (บรรทัดละ 1 รายการ: เวลา | หัวข้อ)</h2>
        <textarea
          className="field-input font-mono text-sm"
          rows={5}
          value={agendaText}
          onChange={(e) => setAgendaText(e.target.value)}
          placeholder="09:00 | ลงทะเบียน&#10;09:30 | บรรยายพิเศษ"
        />
      </section>

      <section className="card p-5 space-y-4">
        <F label="ลิงก์ Zoom (ส่งพร้อมใบเสร็จ)">
          <input className="field-input" value={cfg.zoom_link} onChange={(e) => set("zoom_link", e.target.value)} placeholder="https://zoom.us/j/..." />
        </F>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cfg.register_open} onChange={(e) => set("register_open", e.target.checked)} />
          เปิดรับลงทะเบียน
        </label>
      </section>

      <button className="btn-primary" disabled={saving}>
        {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
      </button>
    </form>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
