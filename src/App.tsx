import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AwakeningPage from "./pages/AwakeningPage";
import DemoFlowPage from "./pages/DemoFlowPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MatchingPage from "./pages/MatchingPage";
import RoadmapPage from "./pages/RoadmapPage";
import StudentHomePage from "./pages/StudentHomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student/home" element={<StudentHomePage />} />
      <Route path="/student/awakening" element={<AwakeningPage />} />
      <Route path="/student/vision" element={<AwakeningPage initialStep={4} />} />
      <Route path="/student/action-plan" element={<AwakeningPage initialStep={6} />} />
      <Route path="/student/matching" element={<MatchingPage />} />
      <Route path="/student/roadmap" element={<RoadmapPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/demo" element={<DemoFlowPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
