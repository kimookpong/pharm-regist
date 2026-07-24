import type { Env } from "../types";
import type { EmailCtx } from "./templates";

// ค่าตั้งงานประชุม (เก็บใน KV key "event")
export interface EventSettings {
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

export const DEFAULT_EVENT: EventSettings = {
  title: "การประชุมวิชาการออนไลน์",
  banner: "",
  detail: "",
  event_date: "",
  cpe: 0,
  activity_code: "",
  agenda: [],
  contact: "",
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
