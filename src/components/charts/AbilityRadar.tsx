import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { abilityKeys, type AbilityScores } from "../../domain";
import { abilityLabels } from "../../data/catalog";

type AbilityRadarProps = { current: AbilityScores; required?: AbilityScores };

export default function AbilityRadar({ current, required }: AbilityRadarProps) {
  const data = abilityKeys.map((key) => ({ ability: abilityLabels[key], 当前能力: current[key], 岗位要求: required?.[key] ?? 0 }));
  return <div className="ability-radar"><ResponsiveContainer height={255} width="100%"><RadarChart data={data} outerRadius="68%"><PolarGrid stroke="rgba(255,255,255,.16)" /><PolarAngleAxis dataKey="ability" tick={{ fill: "#b8c2b4", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#151b15", border: "1px solid #334033", color: "#fff" }} /><Radar dataKey="当前能力" fill="#76b900" fillOpacity={0.2} name="当前能力" stroke="#76b900" />{required && <Radar dataKey="岗位要求" fill="#e8f0e5" fillOpacity={0.04} name="岗位要求" stroke="#e8f0e5" strokeDasharray="4 4" />}</RadarChart></ResponsiveContainer></div>;
}
