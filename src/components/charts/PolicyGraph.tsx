import { BrainCircuit, Building2, Database, HeartPulse, Landmark, MonitorCog } from "lucide-react";

const policyNodes = [
  { label: "人工智能+", icon: BrainCircuit },
  { label: "数据要素", icon: Database },
  { label: "数字中国", icon: Landmark },
  { label: "智慧医疗", icon: HeartPulse },
  { label: "智能制造", icon: MonitorCog },
  { label: "教育数字化", icon: Building2 },
];

const jobs = ["AI工程师", "数据分析师", "医疗AI研究员", "教育技术产品经理"];

export default function PolicyGraph() {
  return (
    <div className="policy-graph" aria-label="专业政策产业岗位关联图">
      <div className="graph-center">计算机科学与技术</div>
      <div className="graph-ring">
        {policyNodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div className={`graph-node node-${index}`} key={node.label}>
              <Icon size={18} />
              <span>{node.label}</span>
            </div>
          );
        })}
      </div>
      <div className="job-row">
        {jobs.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
