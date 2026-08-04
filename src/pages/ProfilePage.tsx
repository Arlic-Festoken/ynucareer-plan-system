import { ArrowRight, Check, Cloud, Compass, LogOut, Mail, Save, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import { majors } from "../data/catalog";
import { useAuthStore } from "../store/authStore";
import { resolveHome, useCareerStore } from "../store/careerStore";

const pathLabels = { employment: "就业准备", recommendation: "推免准备", postgraduate: "考研准备", "civil-service": "考公准备" };

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const storedProfile = useAuthStore((state) => state.profile);
  const syncStatus = useAuthStore((state) => state.syncStatus);
  const lastSyncedAt = useAuthStore((state) => state.lastSyncedAt);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const syncCareerNow = useAuthStore((state) => state.syncCareerNow);
  const logout = useAuthStore((state) => state.logout);
  const careerProfile = useCareerStore((state) => state.profile);
  const updateCareerProfile = useCareerStore((state) => state.updateProfile);
  const initial = useMemo(() => ({
    university: storedProfile?.university || "云南大学",
    college: storedProfile?.college || "",
    major: storedProfile?.major || careerProfile.major,
    grade: storedProfile?.grade || careerProfile.grade,
    bio: storedProfile?.bio || "",
  }), [careerProfile.grade, careerProfile.major, storedProfile]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveProfile(form);
      updateCareerProfile({ major: form.major, grade: form.grade });
      await syncCareerNow();
      setMessage("已保存");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  const stage = careerProfile.role === "graduate" ? "科研与就业双线" : careerProfile.grade <= 2 ? "方向探索" : pathLabels[careerProfile.targetPath];
  const gradeLabel = careerProfile.grade <= 4 ? `大 ${careerProfile.grade}` : `研 ${careerProfile.grade - 4}`;

  return <PageShell eyebrow="个人中心" title="完善资料，让建议更贴近你。">
    <section className="profile-summary">
      <div className="profile-avatar"><UserRound size={28} /></div>
      <div><span className="section-kicker">当前账号</span><h2>{user?.displayName}</h2><p><Mail size={15} />{user?.email}</p></div>
      <button className={`profile-sync is-${syncStatus}`} disabled={syncStatus !== "error"} onClick={() => { void syncCareerNow(); }} type="button"><Cloud size={17} /><span>{syncStatus === "saving" ? "正在自动保存" : syncStatus === "loading" ? "正在恢复计划" : syncStatus === "error" ? "已保存在本机" : "已保存到账号"}</span><small>{syncStatus === "error" ? "点击重试云端同步" : lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "账号记忆已开启"}</small></button>
    </section>

    <div className="profile-layout">
      <form className="profile-form" onSubmit={submit}>
        <div><span className="section-kicker">学习背景</span><h2>完善学习背景</h2></div>
        <div className="profile-form-grid">
          <label>学校<input maxLength={80} onChange={(event) => setForm({ ...form, university: event.target.value })} required value={form.university} /></label>
          <label>学院<input maxLength={80} onChange={(event) => setForm({ ...form, college: event.target.value })} placeholder="例如：软件学院" value={form.college} /></label>
          <label>专业<select onChange={(event) => setForm({ ...form, major: event.target.value })} value={form.major}>{majors.map((major) => <option key={major}>{major}</option>)}</select></label>
          <label>当前年级<select onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })} value={form.grade}>{[1, 2, 3, 4, 5, 6, 7].map((grade) => <option key={grade} value={grade}>{grade <= 4 ? `大 ${grade}` : `研 ${grade - 4}`}</option>)}</select></label>
        </div>
        <label>个人简介<textarea maxLength={300} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="可以写关注的问题、做过的项目和希望靠近的场景。" rows={5} value={form.bio} /></label>
        <div className="profile-actions"><button className="button button-primary" disabled={saving} type="submit"><Save size={16} />{saving ? "正在保存" : "保存个人资料"}</button>{message && <span role="status"><Check size={15} />{message}</span>}</div>
      </form>

      <aside className="account-panel">
        <div><Compass size={22} /><span className="section-kicker">当前规划</span><h2>{stage}</h2></div>
        <dl className="account-plan-meta"><div><dt>专业</dt><dd>{careerProfile.major}</dd></div><div><dt>年级</dt><dd>{gradeLabel}</dd></div></dl>
        <Link className="button button-secondary account-home-link" to={resolveHome(careerProfile.role, careerProfile.grade)}>回到工作台 <ArrowRight size={15} /></Link>
        <button className="button button-quiet danger-button" onClick={signOut} type="button"><LogOut size={16} />退出登录</button>
      </aside>
    </div>
  </PageShell>;
}
