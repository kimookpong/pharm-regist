import type { Env } from "../types";

export type EmailType = "confirm" | "slip_received" | "approved" | "rejected" | "receipt" | "zoom";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  registrationId?: number;
  attachments?: Array<{ filename: string; content: string /* base64 */ }>;
}

/**
 * ส่งอีเมลผ่าน Resend API แล้วบันทึกผลลง email_logs (FR-06)
 * คืน true/false — ไม่ throw เพื่อไม่ให้ flow หลักล้มเพราะอีเมล
 */
export async function sendEmail(env: Env, args: SendArgs): Promise<boolean> {
  let status: "sent" | "failed" = "failed";
  let providerId: string | null = null;
  let error: string | null = null;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        attachments: args.attachments,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { id?: string };
      status = "sent";
      providerId = data.id ?? null;
    } else {
      error = `resend ${res.status}: ${await res.text()}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // log ผล (best-effort)
  try {
    await env.DB.prepare(
      `INSERT INTO email_logs (registration_id, to_email, type, status, provider_id, error)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(args.registrationId ?? null, args.to, args.type, status, providerId, error)
      .run();
  } catch {
    /* ไม่ให้ log ล้มกระทบ flow */
  }

  return status === "sent";
}
