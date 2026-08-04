import {
  BarChart3,
  Bot,
  ClipboardCheck,
  Compass,
  FlaskConical,
  Home,
  LibraryBig,
  Network,
  Moon,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { resolveHome, useCareerStore } from "../../store/careerStore";
import { useAuthStore } from "../../store/authStore";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  mode?: "teacher";
};

type NavItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: typeof Home;
  mobile?: boolean;
};

const roleLabel = { freshman: "探索阶段", junior: "决策阶段", graduate: "研究生", teacher: "教师端" };

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`site-brand${compact ? " compact" : ""}`} to="/" aria-label="向前生涯导航首页">
    <span className="brand-square">→</span>
    <span>向前<span className="brand-sub">CAREER NAVIGATION</span></span>
  </Link>;
}

export default function PageShell({ children, eyebrow, title, description, mode }: PageShellProps) {
  const [storageAvailable] = useState(() => {
    try {
      localStorage.setItem("career-storage-check", "1");
      localStorage.removeItem("career-storage-check");
      return true;
    } catch {
      return false;
    }
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("career-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const hasOnboarded = useCareerStore((state) => state.hasOnboarded);
  const profile = useCareerStore((state) => state.profile);
  const accountUser = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const studentHome = resolveHome(profile.role, profile.grade);
  const isTeacher = mode === "teacher" || accountUser?.role === "teacher" || Boolean(accountUser?.permissions?.length);
  const isPrivate = authStatus === "authenticated" && (isTeacher || hasOnboarded);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("career-theme", theme);
  }, [theme]);

  const studentNav: NavItem[] = [
    { to: studentHome, label: "工作台", icon: Compass, mobile: true },
    {
      to: profile.grade <= 2 ? "/student/awakening" : "/student/matching",
      label: profile.grade <= 2 ? "探索方向" : "目标诊断",
      icon: Sparkles,
    },
    { to: "/student/opportunities", label: "校内资源", shortLabel: "资源", icon: LibraryBig, mobile: true },
    { to: "/student/roadmap", label: "行动计划", shortLabel: "行动", icon: ClipboardCheck, mobile: true },
    { to: "/student/learning-path", label: "学习路径图", icon: Network },
    { to: "/student/abilities", label: "能力与证据", icon: BarChart3 },
    { to: "/student/ai-planning", label: "AI 规划", icon: Bot },
    { to: "/onboarding", label: "调整画像", icon: Sparkles },
    { to: "/account/profile", label: "个人资料", shortLabel: "我的", icon: UserRound, mobile: true },
  ];
  const graduateNav: NavItem[] = [
    { to: "/graduate/navigation", label: "双线计划", shortLabel: "工作台", icon: FlaskConical, mobile: true },
    { to: "/student/opportunities", label: "校内资源", shortLabel: "资源", icon: LibraryBig, mobile: true },
    { to: "/student/abilities", label: "能力与证据", shortLabel: "能力", icon: BarChart3, mobile: true },
    { to: "/onboarding", label: "调整画像", icon: Sparkles },
    { to: "/account/profile", label: "个人资料", shortLabel: "我的", icon: UserRound, mobile: true },
  ];
  const teacherNav: NavItem[] = [
    { to: "/teacher/dashboard", label: "试点工作台", icon: BarChart3, mobile: true },
    { to: "/account/profile", label: "账号与组织", icon: UserRound, mobile: true },
  ];
  const privateNav = isTeacher ? teacherNav : profile.role === "graduate" ? graduateNav : studentNav;
  const publicNav: NavItem[] = [
    { to: "/", label: "首页", icon: Home },
    { to: "/login", label: "登录试点", icon: UserRound },
  ];
  const displayName = accountUser?.displayName || (isTeacher ? "教师工作台" : roleLabel[profile.role]);

  const themeButton = <button
    aria-label={`切换为${theme === "dark" ? "浅色" : "深色"}主题`}
    className="icon-button"
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    title={`切换为${theme === "dark" ? "浅色" : "深色"}主题`}
    type="button"
  >
    {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
  </button>;

  if (!isPrivate) {
    return <div className="site-shell public-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="site-header">
        <Brand />
        <nav aria-label="主导航" className="site-nav">
          {publicNav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={16} />{label}</NavLink>)}
        </nav>
        <div className="site-actions">{themeButton}</div>
      </header>
      {!storageAvailable && <div className="storage-warning" role="alert">暂时无法自动保存，请检查浏览器设置。</div>}
      <main id="main-content" className="site-main">
        {(title || description) && <PageIntro eyebrow={eyebrow} title={title} description={description} />}
        {children}
      </main>
      <footer className="site-footer"><span>向前 · 大学生生涯导航平台</span><span>云南大学校内试点</span></footer>
    </div>;
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className="app-sidebar">
      <Brand compact />
      <nav aria-label="工作区导航" className="sidebar-nav">
        <span className="sidebar-label">{isTeacher ? "组织工作区" : "我的成长工作区"}</span>
        {privateNav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={18} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-context">
        <span>{isTeacher ? "校级试点成员" : roleLabel[profile.role]}</span>
        <strong>{displayName}</strong>
        {!isTeacher && <small>{profile.major || "尚未填写专业"}</small>}
      </div>
    </aside>
    <div className="app-frame">
      <header className="app-topbar">
        <div>
          <span>{isTeacher ? "校级试点工作区" : "个人成长闭环"}</span>
          <strong>{displayName}</strong>
        </div>
        {themeButton}
      </header>
      {!storageAvailable && <div className="storage-warning" role="alert">暂时无法自动保存，请检查浏览器设置。</div>}
      <main id="main-content" className="site-main app-main">
        {(title || description) && <PageIntro eyebrow={eyebrow} title={title} description={description} />}
        {children}
      </main>
      <footer className="site-footer app-footer"><span>向前 · 校级试点</span><span>数据仅用于成长反馈</span></footer>
    </div>
    <nav aria-label="移动端主导航" className="mobile-tabbar">
      {privateNav.filter((item) => item.mobile).slice(0, 4).map(({ to, label, shortLabel, icon: Icon }) =>
        <NavLink key={to} to={to}><Icon size={20} /><span>{shortLabel || label}</span></NavLink>)}
    </nav>
  </div>;
}

function PageIntro({ eyebrow, title, description }: Pick<PageShellProps, "eyebrow" | "title" | "description">) {
  return <section className="page-intro">
    <div>
      {eyebrow && <span className="section-kicker">{eyebrow}</span>}
      {title && <h1>{title}</h1>}
      {description && <p>{description}</p>}
    </div>
  </section>;
}
