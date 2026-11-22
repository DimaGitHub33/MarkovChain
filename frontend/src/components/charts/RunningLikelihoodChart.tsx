import type { GroupId, Step } from "../../lib/types";
import { formatDecimal } from "../../lib/format";

interface LineChartProps {
  steps: Step[];
  labelOf: (id: string) => string;
}

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 34, left: 48 };

/** Cumulative log-likelihood per step for both groups. The line that ends higher wins. */
export function RunningLikelihoodChart({ steps, labelOf }: LineChartProps) {
  const groups: GroupId[] = ["callers", "non_callers"];
  const all = steps.flatMap((step) => groups.map((group) => step.cumulative[group]));
  const min = Math.min(...all, 0);
  const max = 0;
  const xOf = (index: number) => PAD.left + (steps.length === 1 ? (W - PAD.left - PAD.right) / 2 : (index / (steps.length - 1)) * (W - PAD.left - PAD.right));
  const yOf = (value: number) => PAD.top + ((max - value) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = Array.from({ length: 5 }, (_, i) => max - (i / 4) * (max - min));
  const color: Record<GroupId, string> = { callers: "var(--callers)", non_callers: "var(--noncallers)" };
  const step = Math.max(1, Math.ceil(steps.length / 12));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Running log-likelihood for callers and non-callers, step by step">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(tick)} y2={yOf(tick)} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={yOf(tick) + 4} textAnchor="end" fontSize="11" fill="var(--text-subtle)">{formatDecimal(tick, 0)}</text>
          </g>
        ))}
        {steps.map((s, index) => index % step === 0 && (
          <text key={s.position} x={xOf(index)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--text-subtle)">{s.position}</text>
        ))}
        <text x={W / 2} y={H} textAnchor="middle" fontSize="11" fill="var(--text-subtle)">step</text>
        {groups.map((group) => (
          <g key={group}>
            <polyline
              fill="none"
              stroke={color[group]}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={steps.map((s, index) => `${xOf(index)},${yOf(s.cumulative[group])}`).join(" ")}
            />
            {steps.map((s, index) => (
              <circle key={s.position} cx={xOf(index)} cy={yOf(s.cumulative[group])} r="3.5" fill="var(--surface)" stroke={color[group]} strokeWidth="2">
                <title>{`Step ${s.position} · ${s.from ? `${labelOf(s.from)} → ` : "start: "}${labelOf(s.to)} · ${group === "callers" ? "Callers" : "Non-callers"}: ${formatDecimal(s.cumulative[group])}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-callers" />Callers' model</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-noncallers" />Non-callers' model</span>
        <span className="text-subtle">Higher (closer to 0) means the sequence fits better.</span>
      </figcaption>
    </figure>
  );
}
