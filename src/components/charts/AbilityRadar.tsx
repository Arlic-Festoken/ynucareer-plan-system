import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { abilityLabels } from "../../data/mockData";
import type { AbilityScores } from "../../types";

type AbilityRadarProps = {
  current: AbilityScores;
  required?: AbilityScores;
};

const keys = Object.keys(abilityLabels) as Array<keyof AbilityScores>;

export default function AbilityRadar({ current, required }: AbilityRadarProps) {
  const data = keys.map((key) => ({
    ability: abilityLabels[key],
    当前能力: current[key],
    岗位要求: required?.[key] ?? 0,
  }));

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={310}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(29,29,31,0.1)" />
          <PolarAngleAxis dataKey="ability" tick={{ fill: "#6e6e73", fontSize: 12 }} />
          <Tooltip />
          <Radar
            name="当前能力"
            dataKey="当前能力"
            stroke="#007aff"
            fill="#007aff"
            fillOpacity={0.18}
          />
          {required && (
            <Radar
              name="岗位要求"
              dataKey="岗位要求"
              stroke="#af52de"
              fill="#af52de"
              fillOpacity={0.1}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
