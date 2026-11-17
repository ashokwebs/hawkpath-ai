import React, { useMemo, useState } from 'react';
import { DAGNode, DAGEdge, SimulationResult } from '../types';

interface Props {
  nodes: DAGNode[];
  edges: DAGEdge[];
  simulation: SimulationResult;
  failed: Set<string>;
}

const COL_W = 160;
const NODE_W = 132;
const NODE_H = 50;
const ROW_H = 64;
const TOP = 44;
const LEFT = 14;

const DEPT_ORDER = ['CISP', 'MATH', 'PHYS', 'CHEM', 'STAT', 'ENGR', 'ENGWR', 'COMM', 'POLS', 'HIST', 'PSYC'];
const deptRank = (code: string) => {
  const d = code.split(' ')[0];
  const i = DEPT_ORDER.indexOf(d);
  return i === -1 ? 99 : i;
};

function nodeColors(n: DAGNode, isFailed: boolean) {
  if (isFailed) return { fill: '#fef2f2', stroke: '#dc2626', text: '#7f1d1d', sub: '#dc2626' };
  switch (n.status) {
    case 'completed': return { fill: '#f0fdf4', stroke: '#16a34a', text: '#14532d', sub: '#15803d' };
    case 'in-progress': return { fill: '#eff6ff', stroke: '#2563eb', text: '#1e3a8a', sub: '#2563eb' };
    case 'critical': return { fill: '#fff7ed', stroke: '#ea580c', text: '#7c2d12', sub: '#c2410c' };
    default: return { fill: '#ffffff', stroke: '#cbd5e1', text: '#0f172a', sub: '#64748b' };
  }
}

export const DAGView: React.FC<Props> = ({ nodes, edges, simulation, failed }) => {
  const [hover, setHover] = useState<string | null>(null);

  const { pos, cols, width, height } = useMemo(() => {
    const byCol = new Map<number, DAGNode[]>();
    for (const n of nodes) {
      const col = n.semesterIndex ?? 0;
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(n);
    }
    const pos = new Map<string, { x: number; y: number }>();
    let maxRows = 0;
    const colCount = Math.max(simulation.semesters.length + 1, ...[...byCol.keys()].map(k => k + 1));
    for (const [col, list] of byCol) {
      list.sort((a, b) => deptRank(a.code) - deptRank(b.code) || a.code.localeCompare(b.code));
      list.forEach((n, i) => pos.set(n.id, { x: LEFT + col * COL_W, y: TOP + i * ROW_H }));
      maxRows = Math.max(maxRows, list.length);
    }
    const cols = Array.from({ length: colCount }, (_, i) =>
      i === 0 ? 'Done / In progress' : (() => { const s = simulation.semesters[i - 1]; return s ? `${s.term} ${s.year}` : ''; })()
    );
    return { pos, cols, width: LEFT * 2 + colCount * COL_W - (COL_W - NODE_W), height: TOP + Math.max(1, maxRows) * ROW_H + 8 };
  }, [nodes, simulation]);

  // Highlight the hovered course's full upstream + downstream chain.
  const related = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    const up = [hover];
    while (up.length) {
      const cur = up.pop()!;
      for (const e of edges) if (e.to === cur && !set.has(e.from)) { set.add(e.from); up.push(e.from); }
    }
    const down = [hover];
    const seen = new Set<string>([hover]);
    while (down.length) {
      const cur = down.pop()!;
      for (const e of edges) if (e.from === cur && !seen.has(e.to)) { seen.add(e.to); set.add(e.to); down.push(e.to); }
    }
    return set;
  }, [hover, edges]);

  return (
    <div className="overflow-x-auto scroll-thin">
      <svg width={width} height={height} className="block" role="img" aria-label="Prerequisite graph laid out by semester">
        {cols.map((label, i) => (
          <g key={i}>
            <rect x={LEFT + i * COL_W - 8} y={4} width={NODE_W + 16} height={height - 8} rx={12}
              fill={i === 0 ? '#f0fdf4' : '#f8fafc'} stroke={i === 0 ? '#dcfce7' : '#f1f5f9'} />
            <text x={LEFT + i * COL_W + NODE_W / 2} y={26} textAnchor="middle" fontSize={11} fontWeight={600}
              fill={i === 0 ? '#15803d' : '#64748b'} letterSpacing="0.06em">{label.toUpperCase()}</text>
          </g>
        ))}

        {edges.map(e => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
          const sameCol = Math.abs(x1 - NODE_W - x2) < 1;
          const d = sameCol
            ? `M ${a.x + NODE_W / 2} ${a.y + NODE_H} C ${a.x + NODE_W / 2 + 30} ${y1 + 30}, ${b.x + NODE_W / 2 + 30} ${b.y - 20}, ${b.x + NODE_W / 2} ${b.y}`
            : `M ${x1} ${y1} C ${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}`;
          const dim = related && !(related.has(e.from) && related.has(e.to));
          return (
            <path key={`${e.from}->${e.to}`} d={d} fill="none" className={`dag-edge ${e.isCritical ? 'edge-critical' : ''}`}
              stroke={e.isCritical ? '#ea580c' : '#94a3b8'} strokeWidth={e.isCritical ? 2.2 : 1.2}
              opacity={dim ? 0.08 : e.isCritical ? 0.95 : 0.6} />
          );
        })}

        {nodes.map(n => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isFailed = failed.has(n.code);
          const c = nodeColors(n, isFailed);
          const dim = related && !related.has(n.id);
          const sub = isFailed ? 'RETAKE · failed' : n.status === 'completed' ? `Grade ${n.grade}` : n.status === 'in-progress' ? 'In progress' : n.isCriticalPath ? 'Critical path' : `${n.units} units`;
          return (
            <g key={n.id} className="dag-node cursor-pointer" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              opacity={dim ? 0.18 : 1} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
              <title>{`${n.code} — ${n.title}\nPrereqs: ${n.prereqs.join(', ') || 'none'}`}</title>
              <rect width={NODE_W} height={NODE_H} rx={10} fill={c.fill} stroke={c.stroke}
                strokeWidth={n.isCriticalPath || isFailed ? 2 : 1.2} />
              <text x={10} y={20} fontSize={12.5} fontWeight={700} fill={c.text} fontFamily="Fira Code, monospace">{n.code}</text>
              <text x={10} y={37} fontSize={10} fill={c.sub}>{sub}</text>
              {n.isCriticalPath && !isFailed && n.status !== 'completed' && (
                <circle cx={NODE_W - 12} cy={12} r={4} fill="#ea580c" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const DAGLegend: React.FC = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
    {[
      ['#16a34a', 'Completed'], ['#2563eb', 'In progress'], ['#ea580c', 'Critical path'],
      ['#94a3b8', 'Planned'], ['#dc2626', 'Failed → retake'],
    ].map(([color, label]) => (
      <span key={label} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm border" style={{ borderColor: color, background: `${color}1f` }} />
        {label}
      </span>
    ))}
    <span className="text-slate-500">· hover a course to trace its chain</span>
  </div>
);
