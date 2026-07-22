import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RoleRoute from "./components/common/RoleRoute";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const StudentHomePage = lazy(() => import("./pages/StudentHomePage"));
const AwakeningPage = lazy(() => import("./pages/AwakeningPage"));
const MatchingPage = lazy(() => import("./pages/MatchingPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const GraduatePage = lazy(() => import("./pages/GraduatePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageFallback() { return <div className="route-loader" role="status">正在加载页面…</div>; }

export default function App() {
  return <Suspense fallback={<PageFallback />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/student/home" element={<RoleRoute allowed={["freshman", "junior"]}><StudentHomePage /></RoleRoute>} />
    <Route path="/student/awakening" element={<RoleRoute allowed={["freshman"]}><AwakeningPage /></RoleRoute>} />
    <Route path="/student/matching" element={<RoleRoute allowed={["junior"]}><MatchingPage /></RoleRoute>} />
    <Route path="/student/roadmap" element={<RoleRoute allowed={["freshman", "junior"]}><RoadmapPage /></RoleRoute>} />
    <Route path="/graduate/navigation" element={<RoleRoute allowed={["graduate"]}><GraduatePage /></RoleRoute>} />
    <Route path="/teacher/dashboard" element={<AdminDashboardPage />} />
    <Route path="/admin/dashboard" element={<Navigate replace to="/teacher/dashboard" />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
