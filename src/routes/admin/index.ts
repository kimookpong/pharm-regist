import { Hono } from "hono";
import type { Env, Variables } from "../../types";
import { requireAuth } from "../../middleware/jwt";
import dashboard from "./dashboard";
import registrations from "./registrations";
import review from "./review";
import receipts from "./receipts";
import reports from "./reports";
import exportRoutes from "./export";
import settings from "./settings";
import emailRoutes from "./email";
import adminUpload from "./upload";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ทุกเส้นทางใต้ /api/admin ต้องผ่าน JWT (admin + staff)
app.use("*", requireAuth);

app.route("/", dashboard); // /api/admin/stats
app.route("/registrations", registrations); // /api/admin/registrations[...]
app.route("/registrations", review); // /api/admin/registrations/:id/approve|reject
app.route("/registrations", receipts); // /api/admin/registrations/:id/receipt[/pdf]
app.route("/registrations", emailRoutes); // /api/admin/registrations/:id/{send-email,emails}
app.route("/reports", reports); // /api/admin/reports
app.route("/export", exportRoutes); // /api/admin/export/{csv,xlsx,pdf}
app.route("/settings", settings); // /api/admin/settings
app.route("/upload", adminUpload); // /api/admin/upload/speaker-photo

export default app;
