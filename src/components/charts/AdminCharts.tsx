import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminOverview } from "../../types";

const colors = ["#007aff", "#34c759", "#af52de", "#ff9500", "#8e8e93"];

export function InterestBarChart({ data }: { data: AdminOverview["interestDistribution"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 18 }}>
        <CartesianGrid stroke="rgba(29,29,31,0.07)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#6e6e73", fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 12, 12, 0]}>
          {data.map((item, index) => (
            <Cell key={item.name} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MatchPieChart({ data }: { data: AdminOverview["matchDistribution"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={4}>
          {data.map((item, index) => (
            <Cell key={item.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HeatmapPanel({ data }: { data: AdminOverview["heatmap"] }) {
  return (
    <div className="heatmap-grid">
      {data.map((item) => (
        <div className="heatmap-cell" key={`${item.major}-${item.ability}`}>
          <span>{item.major}</span>
          <strong>{item.ability}</strong>
          <i style={{ width: `${item.score}%` }} />
          <em>{item.score}</em>
        </div>
      ))}
    </div>
  );
}
