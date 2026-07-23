import { BarChart3, Bot, ClipboardCheck, Compass, FlaskConical, Home, RotateCcw, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { resolveHome, useCareerStore } from "../../store/careerStore";

type PageShellProps = { children: ReactNode; eyebrow?: string; title?: string; description?: string; mode?: "teacher" };

const roleLabel = { freshman: "探索阶段", junior: "决策阶段", graduate: "研究生", teacher: "教师端" };

export default function PageShell({ children, eyebrow, title, description, mode }: PageShellProps) {
  const [storageAvailable] = useState(() => {
    try { localStorage.setItem("career-storage-check", "1"); localStorage.removeItem("career-storage-check"); return true; }
    catch { return false; }
  });
  const hasOnboarded = useCareerStore((state) => state.hasOnboarded);
  const profile = useCareerStore((state) => state.profile);
  const resetDemo = useCareerStore((state) => state.resetDemo);
  const studentHome = resolveHome(profile.role, profile.grade);
  const isTeacher = mode === "teacher";
  const privateNav = isTeacher
    ? [{ to: "/teacher/dashboard", label: "模拟洞察", icon: BarChart3 }]
    : profile.role === "graduate"
    ? [{ to: "/graduate/navigation", label: "双线计划", icon: FlaskConical }, { to: "/onboarding", label: "调整画像", icon: Sparkles }]
    : profile.role === "teacher"
      ? [{ to: "/teacher/dashboard", label: "模拟洞察", icon: BarChart3 }]
      : [{ to: studentHome, label: "工作台", icon: Compass }, { to: profile.grade <= 2 ? "/student/awakening" : "/student/matching", label: profile.grade <= 2 ? "探索方向" : "目标诊断", icon: Sparkles }, { to: "/student/ai-planning", label: "AI 规划", icon: Bot }, { to: "/student/roadmap", label: "行动计划", icon: ClipboardCheck }];
  const navItems = isTeacher || hasOnboarded ? privateNav : [{ to: "/", label: "首页", icon: Home }, { to: "/teacher/dashboard", label: "教师入口", icon: BarChart3 }];

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header">
      <Link className="site-brand" to="/" aria-label="向前生涯导航首页"><span className="brand-square">→</span><span>向前<span className="brand-sub">CAREER</span></span></Link>
      <nav aria-label="主导航" className="site-nav">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={16} />{label}</NavLink>)}</nav>
      <div className="site-actions">{isTeacher ? <span className="stage-chip">教师端 · 脱敏模拟数据</span> : hasOnboarded && <span className="stage-chip">{roleLabel[profile.role]} · {profile.major}</span>}{hasOnboarded && !isTeacher && <button aria-label="重置本地演示数据" className="icon-button" onClick={resetDemo} title="重置本地演示数据" type="button"><RotateCcw size={16} /></button>}</div>
    </header>
    {!storageAvailable && <div className="storage-warning" role="alert">当前浏览器阻止本地保存。你仍可浏览，但任务和复盘在刷新后可能丢失。</div>}
    <main id="main-content" className="site-main">
      {(title || description) && <section className="page-intro"><div><span className="section-kicker">{eyebrow}</span>{title && <h1>{title}</h1>}{description && <p>{description}</p>}</div></section>}
      {children}
    </main>
    <footer className="site-footer"><span>向前 · 大学生生涯导航平台</span><span>隐私模式：数据仅保存在当前浏览器，不收集身份、成绩或联系方式</span></footer>
  </div>;
}
