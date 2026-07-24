import { useRef, useState } from "react";
import { getToken } from "../lib/api";

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface Props {
  photoKey: string;
  onChange: (photoKey: string) => void;
}

// key รูปแบบ "speakers/<filename>" → แปลงเป็น URL public
function photoUrl(key: string): string {
  if (!key) return "";
  if (key.startsWith("http")) return key;
  const name = key.replace(/^speakers\//, "");
  return `/api/files/speakers/${name}`;
}

export default function SpeakerPhotoInput({ photoKey, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(file: File) {
    setErr("");
    if (file.size > MAX_SIZE) {
      setErr("รูปต้องไม่เกิน 5 MB");
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setErr("รองรับเฉพาะ JPG, PNG, WEBP");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/speaker-photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json().catch(() => null) as { photo_key?: string; error?: string } | null;
      if (!res.ok || !data?.photo_key) {
        setErr(data?.error ?? "อัพโหลดไม่สำเร็จ");
        return;
      }
      onChange(data.photo_key);
    } catch {
      setErr("เชื่อมต่อไม่ได้");
    } finally {
      setUploading(false);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  const url = photoUrl(photoKey);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-full border border-line overflow-hidden shrink-0 grid place-items-center text-2xl text-gray-400"
          style={{ background: "var(--color-primary-soft)" }}
        >
          {url ? (
            <img src={url} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span aria-hidden>👤</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-sm px-3 py-1.5 rounded-lg border border-line hover:bg-primary-soft text-primary font-medium disabled:opacity-50"
            >
              {uploading ? "กำลังอัพโหลด…" : url ? "เปลี่ยนรูป" : "เลือกรูป"}
            </button>
            {url && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm px-3 py-1.5 rounded-lg text-error hover:underline"
              >
                ลบรูป
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP · ไม่เกิน 5 MB</div>
          {err && <p className="field-error">{err}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onInput}
          className="hidden"
        />
      </div>
    </div>
  );
}
