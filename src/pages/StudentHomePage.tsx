import { Navigate } from "react-router-dom";
import { useUserStore } from "../store/userStore";

export default function StudentHomePage() {
  const { role, student } = useUserStore();

  if (role === "teacher") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={student.grade <= 2 ? "/student/awakening" : "/student/matching"} replace />;
}
