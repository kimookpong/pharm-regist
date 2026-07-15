import { Hono } from "hono";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/admin/reports — รายงานสรุป (FR-10)
app.get("/", async (c) => {
  const db = c.env.DB;

  const groupBy = async (sql: string) => (await db.prepare(sql).all()).results as Array<{ k: string; n: number }>;

  const [byOccupation, byProvince, byReceiptType, totalsRow] = await Promise.all([
    groupBy(
      `SELECT occupation AS k, COUNT(*) AS n FROM registrations GROUP BY occupation ORDER BY n DESC`,
    ),
    groupBy(
      `SELECT COALESCE(NULLIF(postal_province,''),'(ไม่ระบุ)') AS k, COUNT(*) AS n
       FROM registrations GROUP BY k ORDER BY n DESC`,
    ),
    groupBy(
      `SELECT CASE receipt_type WHEN 'post' THEN 'ไปรษณีย์' ELSE 'อีเมล' END AS k, COUNT(*) AS n
       FROM registrations GROUP BY receipt_type`,
    ),
    db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(occupation = 'เภสัชกร'), 0) AS pharmacists,
           COALESCE(SUM(approve_status = 'approved'), 0) AS approved,
           COALESCE(SUM(CASE WHEN approve_status = 'approved' THEN amount ELSE 0 END), 0) AS revenue
         FROM registrations`,
      )
      .first<{ total: number; pharmacists: number; approved: number; revenue: number }>(),
  ]);

  return c.json({
    totals: totalsRow ?? { total: 0, pharmacists: 0, approved: 0, revenue: 0 },
    byOccupation,
    byProvince,
    byReceiptType,
  });
});

export default app;
