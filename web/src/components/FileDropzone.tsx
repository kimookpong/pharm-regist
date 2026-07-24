import { useRef, useState } from "react";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB (ตรงกับ server)
const ACCEPT: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

export interface SlipValue {
  key: string;
  filename: string;
}

interface Props {
  value: SlipValue | null;
  onChange: (v: SlipValue | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// อัพโหลดพร้อม progress (XHR — fetch ให้ progress ไม่ได้)
function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ slip_key: string; slip_filename: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("อ่านผลลัพธ์ไม่ได้"));
        }
      } else {
        let msg = "อัพโหลดไม่สำเร็จ";
        try {
          msg = JSON.parse(xhr.responseText).error ?? msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("เชื่อมต่อไม่ได้"));
    xhr.send(fd);
  });
}

export default function FileDropzone({ value, onChange, onUploadingChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState("");
  const [preview, setPreview] = useState<{ url: string; isImage: boolean; name: string; size: string } | null>(null);

  function setUp(v: boolean) {
    setUploading(v);
    onUploadingChange?.(v);
  }

  async function handleFile(file: File) {
    setLocalError("");
    if (!ACCEPT[file.type]) {
      setLocalError("รองรับเฉพาะไฟล์ PDF, JPG, PNG");
      return;
    }
    if (file.size > MAX_SIZE) {
      setLocalError("ไฟล์ต้องไม่เกิน 10 MB");
      return;
    }
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    setPreview({ url, isImage, name: file.name, size: humanSize(file.size) });
    setUp(true);
    setProgress(0);
    try {
      const r = await uploadWithProgress(file, setProgress);
      onChange({ key: r.slip_key, filename: r.slip_filename });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "อัพโหลดไม่สำเร็จ");
      URL.revokeObjectURL(url);
      setPreview(null);
      onChange(null);
    } finally {
      setUp(false);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ""; // ให้เลือกไฟล์เดิมซ้ำได้
  }

  function remove() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    onChange(null);
    setLocalError("");
  }

  const shownError = localError || error;
  const hasFile = !!value && !!preview;

  // สถานะมีไฟล์แล้ว → โชว์ preview
  if (hasFile || uploading) {
    return (
      <div>
        <div className="card p-3 flex items-center gap-3" style={{ borderColor: "var(--color-line)" }}>
          {preview?.isImage ? (
            <img src={preview.url} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-line shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-bg border border-line flex items-center justify-center text-2xl shrink-0">
              📄
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{preview?.name}</div>
            <div className="text-xs text-gray-500">{preview?.size}</div>
            {uploading ? (
              <div className="mt-1">
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">กำลังอัพโหลด… {progress}%</div>
              </div>
            ) : (
              <div className="text-xs text-success mt-0.5">✓ แนบไฟล์แล้ว</div>
            )}
          </div>
          {!uploading && (
            <div className="flex flex-col gap-1 shrink-0 text-sm">
              {preview && (
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  เปิดดู
                </a>
              )}
              <button type="button" onClick={remove} className="text-error hover:underline">
                ลบ/เปลี่ยน
              </button>
            </div>
          )}
        </div>
        {shownError && <p className="field-error">{shownError}</p>}
      </div>
    );
  }

  // สถานะว่าง → dropzone
  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--color-secondary)" : "var(--color-line)",
          background: dragOver ? "rgba(67,160,71,0.06)" : "transparent",
        }}
      >
        <div className="text-3xl mb-1">⬆️</div>
        <div className="font-medium text-primary">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือก</div>
        <div className="text-xs text-gray-500 mt-1">PDF, JPG, PNG · ไม่เกิน 10 MB</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={onInput}
          className="hidden"
        />
      </div>
      {shownError && <p className="field-error">{shownError}</p>}
    </div>
  );
}
