import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api, getToken } from "../lib/api";

export default function PublicLayout() {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ pending: number }>("/api/admin/stats")
      .then((s) => setPending(s.pending))
      .catch(() => setPending(null));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span
              className="w-9 h-9 rounded-xl grid place-items-center text-white font-bold"
              style={{ background: "var(--color-primary)" }}
              aria-hidden
            >
              ภ
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-primary text-[15px] group-hover:underline">CCPE</span>
              <span className="text-[11px] text-gray-500">ประชุมวิชาการเภสัชศาสตร์ WU</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <NavItem to="/">หน้าหลัก</NavItem>
            <NavItem to="/register">ลงทะเบียน</NavItem>
            <NavItem to="/status">ตรวจสอบสถานะ</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white/60 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-6 grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <div className="font-semibold text-primary mb-1">CCPE 2569</div>
            <p className="text-gray-600 leading-relaxed">
              ประชุมวิชาการเภสัชศาสตร์ ประจำปี 2569
              <br />
              รูปแบบออนไลน์ผ่าน Zoom
            </p>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">จัดโดย</div>
            <p className="text-gray-600 leading-relaxed">
              สำนักวิชาเภสัชศาสตร์
              <br />
              มหาวิทยาลัยวลัยลักษณ์
            </p>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">ผู้ดูแลระบบ</div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
            >
              เข้าสู่ระบบ Admin
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
        </div>
        <div className="border-t border-line py-3 text-center text-xs text-gray-500">
          © 2569 สำนักวิชาเภสัชศาสตร์ มหาวิทยาลัยวลัยลักษณ์
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-lg font-medium transition-colors",
          isActive
            ? "bg-primary text-white"
            : "text-gray-700 hover:bg-primary-soft hover:text-primary",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
