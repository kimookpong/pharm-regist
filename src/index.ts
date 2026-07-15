import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Env, Variables } from "./types";
import publicRoutes from "./routes/public";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", secureHeaders());

// ---- API ----
const api = new Hono<{ Bindings: Env; Variables: Variables }>();
api.get("/health", (c) => c.json({ ok: true, app: c.env.APP_NAME }));
api.route("/", publicRoutes); // /api/event, /api/register, /api/status
api.route("/upload", uploadRoutes); // /api/upload
api.route("/auth", authRoutes); // /api/auth/login
api.route("/admin", adminRoutes); // /api/admin/* (JWT required)

app.route("/api", api);

// เส้นทางที่ไม่ใช่ /api/* → ปล่อยให้ ASSETS (React SPA) จัดการ
// (wrangler.toml ตั้ง run_worker_first = ["/api/*"] และ SPA fallback ไว้แล้ว)
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
