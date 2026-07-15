import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { api, getToken } from "../lib/api";

export default function PublicLayout() {
  const [pending, setPending] = useState<number | null>(null);

  // ถ้าล็อกอิน admin อยู่ ดึงจำนวนที่รออนุมัติมาโชว์เป็น badge (ไม่ล็อกอินไม่ดึง = ไม่รั่วข้อมูล)
  useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ pending: number }>("/api/admin/stats")
      .then((s) => setPending(s.pending))
      .catch(() => setPending(null));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            ประชุมวิชาการออนไลน์
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/register" className="hover:underline">
              ลงทะเบียน
            </Link>
            <Link to="/status" className="hover:underline">
              ตรวจสอบสถานะ
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line py-4 text-center text-sm text-gray-500">
        <div className="mb-2">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium">
            Admin
            {pending !== null && pending > 0 && (
              <span
                className="text-white text-xs font-semibold rounded-full px-1.5 min-w-[1.25rem] text-center"
                style={{ background: "var(--color-warning)" }}
                title={`รออนุมัติ ${pending} รายการ`}
              >
                {pending}
              </span>
            )}
          </Link>
        </div>
        © 2569 ระบบรับลงทะเบียนประชุมวิชาการออนไลน์
      </footer>
    </div>
  );
}
