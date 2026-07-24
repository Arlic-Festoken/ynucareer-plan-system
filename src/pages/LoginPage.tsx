import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { resolveHome, useCareerStore } from "../store/careerStore";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerMode = location.pathname === "/register";
  const status = useAuthStore((state) => state.status);
  const authError = useAuthStore((state) => state.error);
  const initialize = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void initialize(); }, [initialize]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (registerMode) {
        await register({ displayName, email, password });
        navigate("/onboarding", { replace: true });
        return;
      }
      await login({ email, password });
      const requested = searchParams.get("next");
      if (requested?.startsWith("/") && !requested.startsWith("//")) {
        navigate(requested, { replace: true });
        return;
      }
      const career = useCareerStore.getState();
      navigate(career.hasOnboarded ? resolveHome(career.profile.role, career.profile.grade) : "/onboarding", { replace: true });
    } catch {
      // The store exposes a user-safe error next to the form.
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <Link className="site-brand auth-brand" to="/" aria-label="向前生涯导航首页"><span className="brand-square">→</span><span>向前<span className="brand-sub">CAREER</span></span></Link>
    <section className="auth-layout">
      <div className="auth-story"><span className="section-kicker">个人生涯工作台</span><h1>{registerMode ? "建立自己的行动节奏。" : "欢迎回来，继续向前。"}</h1><p>{registerMode ? "从一个方向开始，用行动逐步验证。" : "接着完成上次留下的计划。"}</p><div className="auth-progress-preview" aria-label="规划流程"><div><span>01</span><strong>选方向</strong></div><div><span>02</span><strong>做行动</strong></div><div><span>03</span><strong>看进展</strong></div></div></div>
      <form className="auth-form" onSubmit={submit}>
        <div><span className="section-kicker">{registerMode ? "创建账号" : "账号登录"}</span><h2>{registerMode ? "从这里开始" : "继续你的计划"}</h2></div>
        {registerMode && <label>昵称<input autoComplete="name" maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：云同学" required value={displayName} /></label>}
        <label>邮箱<input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required type="email" value={email} /></label>
        <label>密码<input autoComplete={registerMode ? "new-password" : "current-password"} minLength={10} onChange={(event) => setPassword(event.target.value)} placeholder={registerMode ? "至少 10 个字符" : "输入密码"} required type="password" value={password} /></label>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        <button className="button button-primary auth-submit" disabled={submitting || status === "checking"} type="submit">{submitting ? "正在处理…" : registerMode ? "创建账号" : "登录"} <ArrowRight size={17} /></button>
        <p className="auth-switch">{registerMode ? "已有账号？" : "第一次使用？"} <Link to={registerMode ? "/login" : "/register"}>{registerMode ? "直接登录" : "创建账号"}</Link></p>
      </form>
    </section>
  </main>;
}
