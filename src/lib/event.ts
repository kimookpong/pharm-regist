import type { Env } from "../types";
import type { EmailCtx } from "./templates";

export interface Speaker {
  name: string;
  title: string;
  affiliation: string;
  license_no?: string;
  expertise?: string;
  topic?: string;
  photo_key?: string; // R2 key เช่น "speakers/<uuid>.jpg"
}

// ค่าตั้งงานประชุม (เก็บใน KV key "event")
export interface EventSettings {
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

export const DEFAULT_EVENT: EventSettings = {
  title: "ประชุมวิชาการเภสัชศาสตร์ ประจำปี 2569 รูปแบบออนไลน์",
  subtitle_en: "Updates on the Roles of Pharmacists in Precision Oncology and Parenteral Nutrition",
  subtitle_th: "บทบาทเภสัชกรด้านมะเร็งวิทยาแม่นยำและโภชนบำบัดทางหลอดเลือดดำ",
  banner: "",
  organizer: "สำนักวิชาเภสัชศาสตร์ มหาวิทยาลัยวลัยลักษณ์",
  venue: "ผ่านระบบ Zoom Meeting",
  detail:
    "สำนักวิชาเภสัชศาสตร์ มหาวิทยาลัยวลัยลักษณ์ จัดประชุมวิชาการด้านเภสัชศาสตร์ประจำปี 2569 " +
    "ในรูปแบบออนไลน์ผ่านโปรแกรม Zoom เพื่อส่งเสริมการพัฒนาความรู้และทักษะทางวิชาชีพของเภสัชกร " +
    "บุคลากรทางการแพทย์ คณาจารย์ นักวิจัย และผู้สนใจ ให้สามารถประยุกต์ใช้องค์ความรู้ที่ทันสมัย " +
    "ในการดูแลผู้ป่วยได้อย่างเหมาะสม",
  event_date: "29 สิงหาคม 2569 เวลา 13.00–16.30 น.",
  cpe: 0,
  activity_code: "",
  agenda: [
    { time: "12.45–13.00", topic: "ลงทะเบียนเข้าร่วมงาน" },
    { time: "13.00–13.10", topic: "กล่าวเปิดการบรรยาย" },
    {
      time: "13.10–14.40",
      topic:
        "Pharmacogenomics in Precision Oncology: Future Directions and the Expanding Role of Pharmacists — ผศ.ภก.ธีรภัทร์ มาแจ่ม",
    },
    { time: "14.40–14.50", topic: "พักเบรก" },
    {
      time: "14.50–16.20",
      topic:
        "Beyond the PN Prescription: Pharmacist-Led Optimization for Safer and More Effective Parenteral Nutrition — ผศ.ภญ.ณิชกานต์ อภิรมย์รักษ์",
    },
    { time: "16.20–16.30", topic: "ชี้แจงการสอบหลังการบรรยายและปิดการประชุมวิชาการ" },
  ],
  speakers: [
    {
      name: "ผศ.ดร.ภก.ธีรภัทร์ มาแจ่ม",
      title: "อาจารย์ สาขาการบริบาลทางเภสัชกรรม",
      affiliation: "สำนักวิชาเภสัชศาสตร์ มหาวิทยาลัยวลัยลักษณ์",
      license_no: "ภ.37031",
      expertise: "Oncology Pharmacotherapy, Pharmacogenomics & Precision Medicine",
      topic: "Pharmacogenomics in Precision Oncology",
    },
    {
      name: "ผศ.ดร.ภญ.ณิชกานต์ อภิรมย์รักษ์",
      title: "อาจารย์ สาขาการบริบาลทางเภสัชกรรม",
      affiliation: "สำนักวิชาเภสัชศาสตร์ มหาวิทยาลัยวลัยลักษณ์",
      license_no: "ภ.37093",
      expertise: "Clinical Nutrition Pharmacotherapy",
      topic: "Pharmacist-Led Optimization for Parenteral Nutrition",
    },
  ],
  objectives: [
    "เพิ่มพูนความรู้และความเข้าใจเกี่ยวกับหลักการและการประยุกต์ใช้เภสัชจีโนมิกส์ในการรักษาโรคมะเร็งแบบแม่นยำ",
    "เข้าใจทิศทางในอนาคตและบทบาทที่ขยายตัวของเภสัชกรในการดูแลผู้ป่วยมะเร็งโดยใช้ข้อมูลทางพันธุกรรม",
    "เสริมสร้างความรู้เกี่ยวกับการประเมิน การออกแบบ และการปรับสูตรโภชนบำบัดทางหลอดเลือดดำให้เหมาะสมกับผู้ป่วยแต่ละราย",
    "พัฒนาความเข้าใจเกี่ยวกับบทบาทของเภสัชกรในการป้องกันความคลาดเคลื่อน เฝ้าระวังภาวะแทรกซ้อน และเพิ่มความปลอดภัยในการให้สารอาหารทางหลอดเลือดดำ",
    "ส่งเสริมให้ผู้เข้าร่วมประชุมสามารถนำองค์ความรู้ที่ได้รับไปประยุกต์ใช้ในการปฏิบัติงาน การเรียนการสอน การวิจัย และการพัฒนาระบบบริการทางเภสัชกรรม",
  ],
  keywords: ["Pharmacogenomics", "Oncology", "Parenteral Nutrition", "Clinical Nutrition"],
  target_audience: "เภสัชกรประจำโรงพยาบาลและร้านยา รวมถึงบุคลากรทางการแพทย์ที่เกี่ยวข้อง",
  contact: "คุณศิรินันท์ คงพันธ์ / คุณพัชราภรณ์ วงศ์สุวรรณ",
  fee: 0,
  zoom_link: "",
  register_open: true,
};

export async function getEventSettings(env: Env): Promise<EventSettings> {
  const raw = await env.CONFIG.get("event");
  return raw ? { ...DEFAULT_EVENT, ...JSON.parse(raw) } : DEFAULT_EVENT;
}

// context สำหรับเทมเพลตอีเมล (ข้อมูลงาน + base URL)
export function emailCtx(env: Env, ev: EventSettings): EmailCtx {
  return {
    appUrl: env.APP_URL,
    event: { title: ev.title, event_date: ev.event_date, cpe: ev.cpe, contact: ev.contact },
  };
}
