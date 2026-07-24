// ตรวจสอบ Cloudflare Turnstile token ฝั่ง server (canonical siteverify)
// เรียกจาก backend เท่านั้น — ห้ามเรียกจาก browser
export async function verifyTurnstile(secret: string, token: string, remoteIp?: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
