import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, setToken } from "../../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post<{ token: string }>("/api/auth/login", { username, password });
      setToken(r.token);
      nav("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center text-primary">เข้าสู่ระบบเจ้าหน้าที่</h1>
        <div>
          <label className="field-label">ชื่อผู้ใช้</label>
          <input className="field-input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label">รหัสผ่าน</label>
          <input type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
