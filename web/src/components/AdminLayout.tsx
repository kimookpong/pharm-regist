import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/api";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/registrations", label: "รายชื่อผู้สมัคร", end: false },
  { to: "/admin/reports", label: "รายงาน", end: false },
  { to: "/admin/settings", label: "ตั้งค่า", end: false },
];

export default function AdminLayout() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-bold">แผงควบคุมเจ้าหน้าที่</span>
          <button
            onClick={() => {
              clearToken();
              nav("/admin/login");
            }}
            className="text-sm hover:underline"
          >
            ออกจากระบบ
          </button>
        </div>
        <nav className="px-4 flex gap-1 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-t-lg ${isActive ? "bg-bg text-primary font-semibold" : "hover:bg-white/10"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
