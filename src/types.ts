import type { D1Database, R2Bucket, KVNamespace, Fetcher } from "@cloudflare/workers-types";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  CONFIG: KVNamespace;
  // vars
  APP_NAME: string;
  EVENT_YEAR: string;
  APP_URL: string;
  TURNSTILE_SITEKEY: string; // public site key (ว่าง = ปิด Turnstile)
  // secrets
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
  TURNSTILE_SECRET: string; // ตั้งด้วย wrangler secret put (ว่าง = ข้ามการตรวจ)
}

export interface JwtPayload {
  sub: number; // user id
  username: string;
  role: "admin" | "staff";
  exp: number;
}

// ตัวแปรที่ middleware แนบเข้า context
export type Variables = {
  user: JwtPayload;
};
