import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function AuthRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => { void initialize(); }, [initialize]);

  if (status === "idle" || status === "checking") return <div className="route-loader" role="status">正在确认登录状态…</div>;
  if (status === "guest") return <Navigate replace to={`/login?next=${encodeURIComponent(location.pathname)}`} />;
  return <>{children}</>;
}
