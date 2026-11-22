import type { ReactNode } from "react";

export const CHART_W = 560;
export const CHART_H = 300;
export const PAD = { top: 14, right: 18, bottom: 42, left: 52 };

export interface Scale {
  x: (value: number) => number;
  y: (value: number) => number;
}

export function makeScale(xDomain: [number, number], yDomain: [number, number]): Scale {
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  return {
    x: (v) => PAD.left + ((v - x0) / (x1 - x0 || 1)) * (CHART_W - PAD.left - PAD.right),
    y: (v) => CHART_H - PAD.bottom - ((v - y0) / (y1 - y0 || 1)) * (CHART_H - PAD.top - PAD.bottom),
  };
}

interface AxesProps {
  scale: Scale;
  xTicks: number[];
  yTicks: number[];
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  xLabel: string;
  yLabel: string;
}

export function Axes({ scale, xTicks, yTicks, xFormat, yFormat, xLabel, yLabel }: AxesProps) {
  return (
    <g fontSize="11" fill="var(--text-subtle)">
      {yTicks.map((tick) => (
        <g key={`y${tick}`}>
          <line x1={PAD.left} x2={CHART_W - PAD.right} y1={scale.y(tick)} y2={scale.y(tick)} stroke="var(--border)" strokeDasharray="3 4" />
          <text x={PAD.left - 8} y={scale.y(tick) + 4} textAnchor="end">{yFormat(tick)}</text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text key={`x${tick}`} x={scale.x(tick)} y={CHART_H - PAD.bottom + 18} textAnchor="middle">{xFormat(tick)}</text>
      ))}
      <line x1={PAD.left} x2={CHART_W - PAD.right} y1={CHART_H - PAD.bottom} y2={CHART_H - PAD.bottom} stroke="var(--border-strong)" />
      <text x={(PAD.left + CHART_W - PAD.right) / 2} y={CHART_H - 6} textAnchor="middle" fill="var(--text-muted)">{xLabel}</text>
      <text transform={`translate(14 ${(PAD.top + CHART_H - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle" fill="var(--text-muted)">{yLabel}</text>
    </g>
  );
}

export function ChartFrame({ label, children, legend }: { label: string; children: ReactNode; legend?: ReactNode }) {
  return (
    <figure>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full overflow-visible" role="img" aria-label={label}>
        {children}
      </svg>
      {legend && <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{legend}</figcaption>}
    </figure>
  );
}

export function LegendItem({ color, dashed, children }: { color: string; dashed?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray={dashed ? "4 3" : undefined} /></svg>
      {children}
    </span>
  );
}

export const linePath = (points: [number, number][]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
