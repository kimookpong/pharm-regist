import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import SpeakerPhotoInput from "../../components/SpeakerPhotoInput";

interface Speaker {
  name: string;
  title: string;
  affiliation: string;
  license_no: string;
  expertise: string;
  topic: string;
  photo_key: string;
}

interface EventCfg {
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
  fee: number; // สตางค์
  zoom_link: string;
  register_open: boolean;
}

const EMPTY_SPEAKER: Speaker = {
  name: "",
  title: "",
  affiliation: "",
  license_no: "",
  expertise: "",
  topic: "",
  photo_key: "",
};

export default function Settings() {
  const [cfg, setCfg] = useState<EventCfg | null>(null);
  const [feeBaht, setFeeBaht] = useState("0");
  const [agendaText, setAgendaText] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<EventCfg>("/api/admin/settings").then((c) => {
      setCfg(c);
      setFeeBaht(String(c.fee / 100));
      setAgendaText(c.agenda.map((a) => `${a.time} | ${a.topic}`).join("\n"));
      setObjectivesText((c.objectives ?? []).join("\n"));
      setKeywordsText((c.keywords ?? []).join(", "));
    });
  }, []);

  if (!cfg) return <p className="text-gray-500">กำลังโหลด…</p>;

  const set = <K extends keyof EventCfg>(k: K, v: EventCfg[K]) => setCfg({ ...cfg, [k]: v });

  const updateSpeaker = (idx: number, patch: Partial<Speaker>) => {
    const next = [...cfg.speakers];
    next[idx] = { ...next[idx], ...patch };
    set("speakers", next);
  };
  const addSpeaker = () => set("speakers", [...cfg.speakers, { ...EMPTY_SPEAKER }]);
  const removeSpeaker = (idx: number) =>
    set("speakers", cfg.speakers.filter((_, i) => i !== idx));

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
    const objectives = objectivesText.split("\n").map((s) => s.trim()).filter(Boolean);
    const keywords = keywordsText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await api.put("/api/admin/settings", {
        ...cfg,
        fee: Math.round(parseFloat(feeBaht || "0") * 100),
        cpe: Number(cfg.cpe) || 0,
        agenda,
        objectives,
        keywords,
      });
      setMsg("บันทึกเรียบร้อย");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "บันทึกไม่สำเร็จ (ต้องเป็นสิทธิ์ผู้ดูแลระบบ)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">ตั้งค่างานประชุม</h1>
      {msg && (
        <div className="card p-3 text-success border-l-4" style={{ borderColor: "var(--color-success)" }}>
          {msg}
        </div>
      )}
      {err && <p className="field-error">{err}</p>}

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">ข้อมูลงาน</h2>
        <F label="ชื่องานประชุม (ภาษาไทย)">
          <input className="field-input" value={cfg.title} onChange={(e) => set("title", e.target.value)} />
        </F>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="หัวข้อภาษาอังกฤษ">
            <input className="field-input" value={cfg.subtitle_en} onChange={(e) => set("subtitle_en", e.target.value)} />
          </F>
          <F label="หัวข้อภาษาไทย">
            <input className="field-input" value={cfg.subtitle_th} onChange={(e) => set("subtitle_th", e.target.value)} />
          </F>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="หน่วยงานผู้จัด">
            <input className="field-input" value={cfg.organizer} onChange={(e) => set("organizer", e.target.value)} />
          </F>
          <F label="สถานที่จัด / รูปแบบ">
            <input className="field-input" value={cfg.venue} onChange={(e) => set("venue", e.target.value)} placeholder="ผ่านระบบ Zoom Meeting" />
          </F>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="วันที่จัดงาน">
            <input className="field-input" value={cfg.event_date} onChange={(e) => set("event_date", e.target.value)} placeholder="29 สิงหาคม 2569 เวลา 13.00–16.30 น." />
          </F>
          <F label="รหัสกิจกรรม CPE">
            <input className="field-input" value={cfg.activity_code} onChange={(e) => set("activity_code", e.target.value)} />
          </F>
          <F label="จำนวน CPE (หน่วย)">
            <input type="number" step="0.5" className="field-input" value={cfg.cpe} onChange={(e) => set("cpe", Number(e.target.value))} />
          </F>
          <F label="ค่าลงทะเบียน (บาท)">
            <input type="number" step="0.01" className="field-input" value={feeBaht} onChange={(e) => setFeeBaht(e.target.value)} />
          </F>
        </div>
        <F label="รายละเอียดงาน / ที่มา">
          <textarea className="field-input" rows={5} value={cfg.detail} onChange={(e) => set("detail", e.target.value)} />
        </F>
        <F label="URL รูป Banner (โลโก้ SPM / โปสเตอร์)">
          <input className="field-input" value={cfg.banner} onChange={(e) => set("banner", e.target.value)} placeholder="https://…" />
        </F>
        <F label="กลุ่มเป้าหมาย">
          <input className="field-input" value={cfg.target_audience} onChange={(e) => set("target_audience", e.target.value)} />
        </F>
        <F label="ช่องทางติดต่อ">
          <input className="field-input" value={cfg.contact} onChange={(e) => set("contact", e.target.value)} />
        </F>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">คำสำคัญ (คั่นด้วยเครื่องหมายจุลภาค)</h2>
        <textarea
          className="field-input text-sm"
          rows={2}
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="Pharmacogenomics, Oncology, Parenteral Nutrition"
        />
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">วัตถุประสงค์ (บรรทัดละ 1 ข้อ)</h2>
        <textarea
          className="field-input text-sm"
          rows={5}
          value={objectivesText}
          onChange={(e) => setObjectivesText(e.target.value)}
        />
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">กำหนดการ (บรรทัดละ 1 รายการ: เวลา | หัวข้อ)</h2>
        <textarea
          className="field-input font-mono text-sm"
          rows={6}
          value={agendaText}
          onChange={(e) => setAgendaText(e.target.value)}
          placeholder="09:00 | ลงทะเบียน&#10;09:30 | บรรยายพิเศษ"
        />
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">วิทยากร</h2>
          <button type="button" onClick={addSpeaker} className="text-sm font-medium text-primary hover:underline">
            + เพิ่มวิทยากร
          </button>
        </div>
        {cfg.speakers.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายชื่อวิทยากร</p>}
        {cfg.speakers.map((sp, idx) => (
          <div key={idx} className="border border-line rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">ท่านที่ {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeSpeaker(idx)}
                className="text-xs text-error hover:underline"
              >
                ลบ
              </button>
            </div>
            <F label="รูปวิทยากร">
              <SpeakerPhotoInput
                photoKey={sp.photo_key}
                onChange={(photo_key) => updateSpeaker(idx, { photo_key })}
              />
            </F>
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="ชื่อ-สกุล">
                <input className="field-input" value={sp.name} onChange={(e) => updateSpeaker(idx, { name: e.target.value })} />
              </F>
              <F label="ตำแหน่ง">
                <input className="field-input" value={sp.title} onChange={(e) => updateSpeaker(idx, { title: e.target.value })} />
              </F>
              <F label="สังกัด">
                <input className="field-input" value={sp.affiliation} onChange={(e) => updateSpeaker(idx, { affiliation: e.target.value })} />
              </F>
              <F label="เลขใบประกอบวิชาชีพ">
                <input className="field-input" value={sp.license_no} onChange={(e) => updateSpeaker(idx, { license_no: e.target.value })} />
              </F>
            </div>
            <F label="ความเชี่ยวชาญ">
              <input className="field-input" value={sp.expertise} onChange={(e) => updateSpeaker(idx, { expertise: e.target.value })} />
            </F>
            <F label="หัวข้อบรรยาย">
              <input className="field-input" value={sp.topic} onChange={(e) => updateSpeaker(idx, { topic: e.target.value })} />
            </F>
          </div>
        ))}
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
