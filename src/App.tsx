import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthRoute from "./components/common/AuthRoute";
import RoleRoute from "./components/common/RoleRoute";
import TeacherRoute from "./components/common/TeacherRoute";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const StudentHomePage = lazy(() => import("./pages/StudentHomePage"));
const AwakeningPage = lazy(() => import("./pages/AwakeningPage"));
const MatchingPage = lazy(() => import("./pages/MatchingPage"));
const OpportunityBoardPage = lazy(() => import("./pages/OpportunityBoardPage"));
const AbilityProfilePage = lazy(() => import("./pages/AbilityProfilePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AiPlanningPage = lazy(() => import("./pages/AiPlanningPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const GraduatePage = lazy(() => import("./pages/GraduatePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageFallback() { return <div className="route-loader" role="status">正在加载页面…</div>; }

export default function App() {
  return <Suspense fallback={<PageFallback />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage key="login" />} />
    <Route path="/register" element={<LoginPage key="register" />} />
    <Route path="/onboarding" element={<AuthRoute><OnboardingPage /></AuthRoute>} />
    <Route path="/student/home" element={<AuthRoute><RoleRoute allowed={["freshman", "junior"]}><StudentHomePage /></RoleRoute></AuthRoute>} />
    <Route path="/student/awakening" element={<AuthRoute><RoleRoute allowed={["freshman"]}><AwakeningPage /></RoleRoute></AuthRoute>} />
    <Route path="/student/matching" element={<AuthRoute><RoleRoute allowed={["junior"]}><MatchingPage /></RoleRoute></AuthRoute>} />
    <Route path="/student/opportunities" element={<AuthRoute><RoleRoute allowed={["freshman", "junior", "graduate"]}><OpportunityBoardPage /></RoleRoute></AuthRoute>} />
    <Route path="/student/abilities" element={<AuthRoute><RoleRoute allowed={["freshman", "junior", "graduate"]}><AbilityProfilePage /></RoleRoute></AuthRoute>} />
    <Route path="/student/notifications" element={<AuthRoute><RoleRoute allowed={["freshman", "junior", "graduate"]}><NotificationsPage /></RoleRoute></AuthRoute>} />
    <Route path="/student/ai-planning" element={<AuthRoute><RoleRoute allowed={["freshman", "junior"]}><AiPlanningPage /></RoleRoute></AuthRoute>} />
    <Route path="/student/roadmap" element={<AuthRoute><RoleRoute allowed={["freshman", "junior"]}><RoadmapPage /></RoleRoute></AuthRoute>} />
    <Route path="/graduate/navigation" element={<AuthRoute><RoleRoute allowed={["graduate"]}><GraduatePage /></RoleRoute></AuthRoute>} />
    <Route path="/account/profile" element={<AuthRoute><ProfilePage /></AuthRoute>} />
    <Route path="/teacher/dashboard" element={<AuthRoute><TeacherRoute><AdminDashboardPage /></TeacherRoute></AuthRoute>} />
    <Route path="/admin/dashboard" element={<Navigate replace to="/teacher/dashboard" />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
