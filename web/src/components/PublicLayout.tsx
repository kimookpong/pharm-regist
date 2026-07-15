import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            ประชุมวิชาการออนไลน์
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:underline">
              หน้าแรก
            </Link>
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
        © 2569 ระบบรับลงทะเบียนประชุมวิชาการออนไลน์
      </footer>
    </div>
  );
}
