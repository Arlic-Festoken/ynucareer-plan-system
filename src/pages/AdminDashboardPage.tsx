import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Filter, Lightbulb, SearchX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import PageShell from "../components/common/PageShell";
import SignalMetric from "../components/product/SignalMetric";
import { cohortRecords, majors, pathwayGuidance } from "../data/catalog";

type FilterStage = "全部" | "低年级" | "高年级" | "研究生";
function countBy(items: string[]) { return Object.entries(items.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item]: (acc[item] ?? 0) + 1 }), {})).map(([name, value]) => ({ name, value })); }

export default function AdminDashboardPage() {
  const [stage, setStage] = useState<FilterStage>("全部");
  const [major, setMajor] = useState("全部");
  const [pathway, setPathway] = useState("全部");
  const filtered = useMemo(() => cohortRecords.filter((record) => (stage === "全部" || record.stage === stage) && (major === "全部" || record.major === major) && (pathway === "全部" || record.pathway === pathway)), [stage, major, pathway]);
  const interestData = useMemo(() => countBy(filtered.map((record) => record.interest)), [filtered]);
  const gapData = useMemo(() => countBy(filtered.map((record) => record.gap)), [filtered]);
  const completion = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.completion, 0) / filtered.length) : 0;
  const topGap = [...gapData].sort((a, b) => b.value - a.value)[0]?.name ?? "暂无";
  const resetFilters = () => { setStage("全部"); setMajor("全部"); setPathway("全部"); };
  return <PageShell mode="teacher" eyebrow="教师端 / 模拟洞察" title="把群体信号转成可以安排的教学支持。" description="以下均为内置的脱敏模拟样本，用于展示筛选与聚合逻辑，不代表真实学院统计。">
    <section className="teacher-notice"><Filter size={19} /><p><strong>数据说明：</strong>不读取浏览器里的个人画像，也不展示任何可识别的学生记录。</p></section>
    <section className="teacher-filters"><label>阶段<select aria-label="阶段" onChange={(event) => setStage(event.target.value as FilterStage)} value={stage}>{["全部", "低年级", "高年级", "研究生"].map((item) => <option key={item}>{item}</option>)}</select></label><label>专业<select aria-label="专业" onChange={(event) => setMajor(event.target.value)} value={major}><option>全部</option>{majors.map((item) => <option key={item}>{item}</option>)}</select></label><label>路径<select aria-label="路径" onChange={(event) => setPathway(event.target.value)} value={pathway}><option>全部</option>{Object.entries(pathwayGuidance).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label></section>
    <section className="teacher-summary"><SignalMetric detail="筛选后的模拟记录数。" label="模拟样本" value={filtered.length} /><SignalMetric detail="群体任务闭环的平均状态。" label="平均完成度" tone="neutral" value={`${completion}%`} /><SignalMetric detail="最常出现的能力支持需求。" label="首要短板" tone="warm" value={topGap} /><SignalMetric detail="本次筛选所覆盖的培养阶段。" label="覆盖阶段" value={new Set(filtered.map((item) => item.stage)).size} /></section>
    {filtered.length ? <><section className="teacher-chart-grid"><article className="teacher-chart"><div><span className="section-kicker"><BarChart3 size={15} />兴趣倾向</span><h2>学生希望接近的场景</h2></div><ResponsiveContainer height={290} width="100%"><BarChart data={interestData}><CartesianGrid stroke="rgba(255,255,255,.1)" strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} tick={{ fill: "#bcc7b9", fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: "#bcc7b9", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#161b16", border: "1px solid #3a4937" }} /><Bar dataKey="value" fill="#76b900" isAnimationActive={false} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></article><article className="teacher-chart"><div><span className="section-kicker"><UsersRound size={15} />资源需求</span><h2>需要优先提供的支持</h2></div><ResponsiveContainer height={290} width="100%"><BarChart data={gapData}><CartesianGrid stroke="rgba(255,255,255,.1)" strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} tick={{ fill: "#bcc7b9", fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: "#bcc7b9", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#161b16", border: "1px solid #3a4937" }} /><Bar dataKey="value" fill="#e7efe3" isAnimationActive={false} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></article></section><section className="teaching-action"><Lightbulb size={25} /><div><span className="section-kicker">建议下一步</span><h2>围绕“{topGap}”提供一次可产出证据的支持。</h2><p>可以把它设计成跨课程作业、行业场景讲解、作品反馈或模拟表达，让学生留下可复用的项目、作品或经历描述；低年级优先探索场景，高年级再增加路径比较与表达训练。</p></div></section></> : <section className="teacher-empty"><SearchX size={27} /><div><span className="section-kicker">当前组合没有样本</span><h2>没有符合筛选条件的模拟记录。</h2><p>放宽阶段、专业或路径中的任意一项，再查看群体信号。空结果不会生成教学建议。</p></div><button className="button button-secondary" onClick={resetFilters} type="button">清除筛选</button></section>}
  </PageShell>;
}
