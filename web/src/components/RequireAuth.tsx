import { Navigate } from "react-router-dom";
import { getToken } from "../lib/api";
import type { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
