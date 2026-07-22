import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motivationRadar } from "../../data/mockData";

export default function MotivationRadar() {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={285}>
        <RadarChart data={motivationRadar}>
          <PolarGrid stroke="rgba(29,29,31,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#6e6e73", fontSize: 12 }} />
          <Tooltip />
          <Radar
            name="内驱力"
            dataKey="value"
            stroke="#34c759"
            fill="#34c759"
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
