import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "../../domain";
import { resolveHome, useCareerStore } from "../../store/careerStore";

type RoleRouteProps = {
  allowed: UserRole[];
  children: ReactNode;
};

export default function RoleRoute({ allowed, children }: RoleRouteProps) {
  const hasOnboarded = useCareerStore((state) => state.hasOnboarded);
  const profile = useCareerStore((state) => state.profile);

  if (!hasOnboarded) return <Navigate to="/onboarding" replace />;
  if (!allowed.includes(profile.role)) return <Navigate to={resolveHome(profile.role, profile.grade)} replace />;
  return <>{children}</>;
}
