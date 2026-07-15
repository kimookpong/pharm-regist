import type { D1Database, R2Bucket, KVNamespace, Fetcher } from "@cloudflare/workers-types";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  CONFIG: KVNamespace;
  // vars
  APP_NAME: string;
  EVENT_YEAR: string;
  // secrets
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
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
