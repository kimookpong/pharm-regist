import { Hono } from "hono";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/admin/stats — ตัวเลขสรุปหน้า Dashboard (FR-07)
app.get("/stats", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT
       COUNT(*)                                                   AS total,
       COALESCE(SUM(approve_status = 'pending'),  0)              AS pending,
       COALESCE(SUM(approve_status = 'approved'), 0)              AS approved,
       COALESCE(SUM(approve_status = 'rejected'), 0)              AS rejected,
       COALESCE(SUM(CASE WHEN approve_status = 'approved' THEN amount ELSE 0 END), 0) AS revenue
     FROM registrations`,
  ).first<{ total: number; pending: number; approved: number; rejected: number; revenue: number }>();

  const receipts = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM receipts").first<{ n: number }>();

  return c.json({
    total: row?.total ?? 0,
    pending: row?.pending ?? 0,
    approved: row?.approved ?? 0,
    rejected: row?.rejected ?? 0,
    revenue: row?.revenue ?? 0, // สตางค์
    receipts: receipts?.n ?? 0,
  });
});

export default app;
