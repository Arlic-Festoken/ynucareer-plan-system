import { useMemo } from "react";
import type { LearningPathNode } from "../../domain";

const nodeWidth = 220;
const nodeHeight = 112;
const columnGap = 78;
const rowGap = 34;
const topOffset = 74;
const leftOffset = 28;

function splitTitle(title: string) {
  if (title.length <= 14) return [title];
  return [title.slice(0, 14), title.slice(14, 28)];
}

export default function LearningPathGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: LearningPathNode[];
  edges: Array<{ from: string; to: string }>;
  selectedId: string;
  onSelect: (node: LearningPathNode) => void;
}) {
  const layout = useMemo(() => {
    const phases = [...new Set(nodes.map((item) => item.phase))];
    const byPhase = phases.map((phase) => nodes.filter((item) => item.phase === phase));
    const positions = new Map<string, { x: number; y: number }>();
    byPhase.forEach((items, column) => items.forEach((item, row) => positions.set(item.id, {
      x: leftOffset + column * (nodeWidth + columnGap),
      y: topOffset + row * (nodeHeight + rowGap),
    })));
    return {
      phases,
      positions,
      width: leftOffset * 2 + phases.length * nodeWidth + Math.max(0, phases.length - 1) * columnGap,
      height: topOffset + Math.max(...byPhase.map((items) => items.length), 1) * (nodeHeight + rowGap) + 12,
    };
  }, [nodes]);

  return <div className="learning-path-graph" role="region" aria-label="算法工程师学习路径拓扑图" tabIndex={0}>
    <svg height={layout.height} role="img" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width}>
      <defs>
        <marker id="path-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 z" />
        </marker>
      </defs>
      {layout.phases.map((phase, index) => <g key={phase}>
        <text className="graph-phase-index" x={leftOffset + index * (nodeWidth + columnGap)} y="22">{String(index + 1).padStart(2, "0")}</text>
        <text className="graph-phase-title" x={leftOffset + index * (nodeWidth + columnGap) + 30} y="22">{phase}</text>
      </g>)}
      <g className="graph-edges">{edges.map((edge) => {
        const from = layout.positions.get(edge.from);
        const to = layout.positions.get(edge.to);
        if (!from || !to) return null;
        const startX = from.x + nodeWidth;
        const startY = from.y + nodeHeight / 2;
        const endX = to.x;
        const endY = to.y + nodeHeight / 2;
        const curve = Math.max(24, (endX - startX) / 2);
        return <path d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`} key={`${edge.from}-${edge.to}`} markerEnd="url(#path-arrow)" />;
      })}</g>
      <g className="graph-nodes">{nodes.map((item) => {
        const position = layout.positions.get(item.id);
        if (!position) return null;
        const lines = splitTitle(item.title);
        return <g
          aria-label={`${item.title}，${item.semester}`}
          className={`graph-node is-${item.status}${selectedId === item.id ? " is-selected" : ""}`}
          key={item.id}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(item); }}
          role="button"
          tabIndex={0}
          transform={`translate(${position.x} ${position.y})`}
        >
          <rect height={nodeHeight} rx="15" width={nodeWidth} />
          <text className="graph-node-kind" x="16" y="24">{item.kind.toUpperCase()} · {item.durationWeeks} 周</text>
          {lines.map((line, index) => <text className="graph-node-title" key={line} x="16" y={52 + index * 20}>{line}</text>)}
          <text className="graph-node-semester" x="16" y="96">{item.semester}</text>
          <circle cx={nodeWidth - 17} cy="18" r="4" />
        </g>;
      })}</g>
    </svg>
  </div>;
}
