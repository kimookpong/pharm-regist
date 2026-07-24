import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

// โหลด api.js แบบ explicit — ไม่ใส่ async/defer เพื่อให้ window.turnstile พร้อมเมื่อ onload
let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("โหลด Turnstile ไม่สำเร็จ")));
        return;
      }
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.dataset.turnstile = "1";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("โหลด Turnstile ไม่สำเร็จ"));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export default function TurnstileWidget({
  sitekey,
  onVerify,
}: {
  sitekey: string;
  onVerify: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr("");
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        try {
          widgetId.current = window.turnstile.render(ref.current, {
            sitekey,
            callback: (token: string) => onVerify(token),
            "expired-callback": () => onVerify(""),
            "error-callback": (code?: string) => {
              onVerify("");
              setErr(
                code
                  ? `Turnstile error: ${code} — โดเมนนี้อาจไม่ได้รับอนุญาตในการตั้งค่า widget`
                  : "Turnstile ทำงานผิดพลาด กรุณารีเฟรชหน้า",
              );
            },
          });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "แสดง Turnstile ไม่ได้");
        }
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "โหลด Turnstile ไม่สำเร็จ");
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitekey]);

  return (
    <div>
      <div ref={ref} />
      {err && <p className="field-error mt-1">{err}</p>}
    </div>
  );
}
