import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function TeacherRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const hasStaffAccess = user?.role === "teacher" || Boolean(user?.permissions?.length);
  return hasStaffAccess ? <>{children}</> : <Navigate replace to="/student/home" />;
}
