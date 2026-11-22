import { useMemo, useState } from "react";
import { Axes, CHART_H, ChartFrame, LegendItem, PAD, linePath, makeScale } from "../components/charts/chart";
import { Card, ErrorState, LoadingBlock, PageHeader, SectionTitle, Stat, cx } from "../components/ui";
import { api, useResource } from "../lib/api";
import { formatDecimal, formatInteger, formatPercent } from "../lib/format";
import type { Performance } from "../lib/types";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function BudgetExplorer({ data }: { data: Performance }) {
  const { max_k: maxK, captured_model: model, captured_oracle: oracle } = data.budget;
  const [k, setK] = useState(100);
  const rate = data.test_set.call_rate;
  const caught = model[k - 1];
  const precision = caught / k;
  const recall = caught / data.test_set.callers;
  const scale = makeScale([0, maxK], [0, data.test_set.callers]);
  const sample = (curve: number[]) => {
    const points: [number, number][] = [[scale.x(0), scale.y(0)]];
    for (let i = 9; i < curve.length; i += 10) points.push([scale.x(i + 1), scale.y(curve[i])]);
    return linePath(points);
  };
  const random = linePath([[scale.x(0), scale.y(0)], [scale.x(maxK), scale.y(maxK * rate)]]);

  return (
    <Card>
      <SectionTitle
        title="Call budget"
        description="The call center can make only so many calls. Rank customers by the model, call the top K, and see how many real callers you reach."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <ChartFrame
            label={`Callers caught when calling the top K customers. At K = ${k}, the model catches ${caught} callers.`}
            legend={<>
              <LegendItem color="var(--brand)">Markov model</LegendItem>
              <LegendItem color="var(--text-subtle)" dashed>Best possible (oracle)</LegendItem>
              <LegendItem color="var(--border-strong)" dashed>Random calls</LegendItem>
            </>}
          >
            <Axes scale={scale} xTicks={[0, 500, 1000, 1500, 2000]} yTicks={[0, 100, 200, 300, 400, 500]} xFormat={formatInteger} yFormat={formatInteger} xLabel="customers called (K)" yLabel="callers caught" />
            <path d={random} fill="none" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" />
            <path d={sample(oracle)} fill="none" stroke="var(--text-subtle)" strokeWidth="2" strokeDasharray="6 4" />
            <path d={sample(model)} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
            <line x1={scale.x(k)} x2={scale.x(k)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="var(--callers)" strokeWidth="1.5" />
            <circle cx={scale.x(k)} cy={scale.y(caught)} r="5.5" fill="var(--callers)" stroke="var(--surface)" strokeWidth="2" />
          </ChartFrame>
        </div>
        <div className="flex flex-col justify-center gap-5">
          <label className="block">
            <span className="flex items-baseline justify-between text-sm font-semibold">
              Calls per day <span className="text-2xl font-bold tabular-nums text-brand">{formatInteger(k)}</span>
            </span>
            <input
              type="range"
              min={10}
              max={maxK}
              step={10}
              value={k}
              onChange={(event) => setK(Number(event.target.value))}
              className="mt-3 w-full accent-[var(--brand-solid)]"
              aria-valuetext={`${k} customers called`}
            />
            <span className="mt-1 flex justify-between text-xs text-subtle"><span>10</span><span>{formatInteger(maxK)}</span></span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-callers-soft p-4">
              <p className="text-xs font-medium text-muted">Real callers reached</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-callers">{formatInteger(caught)}</p>
              <p className="text-xs text-muted">{pct(recall)} of all {formatInteger(data.test_set.callers)} callers</p>
            </div>
            <div className="rounded-xl bg-brand-soft p-4">
              <p className="text-xs font-medium text-muted">Useful calls</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-brand">{pct(precision)}</p>
              <p className="text-xs text-muted">vs {pct(rate)} when calling at random</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Calling the top {formatInteger(k)} customers reaches <strong className="text-ink">{(precision / rate).toFixed(1)}×</strong> more
            real callers than calling the same number of random customers.
          </p>
        </div>
      </div>
    </Card>
  );
}

function RocChart({ data }: { data: Performance }) {
  const scale = makeScale([0, 1], [0, 1]);
  const toPath = (points: { fpr: number; tpr: number }[]) => linePath(points.map((p) => [scale.x(p.fpr), scale.y(p.tpr)]));
  const area = `${toPath(data.roc.model)}L${scale.x(1)},${scale.y(0)}L${scale.x(0)},${scale.y(0)}Z`;
  return (
    <ChartFrame
      label={`ROC curve. Area under the curve: model ${formatDecimal(data.auc.model, 3)}, oracle ${formatDecimal(data.auc.oracle, 3)}.`}
      legend={<>
        <LegendItem color="var(--brand)">Model · AUC {formatDecimal(data.auc.model, 3)}</LegendItem>
        <LegendItem color="var(--text-subtle)" dashed>Oracle · {formatDecimal(data.auc.oracle, 3)}</LegendItem>
        <LegendItem color="var(--border-strong)" dashed>Random · 0.5</LegendItem>
      </>}
    >
      <Axes scale={scale} xTicks={[0, 0.25, 0.5, 0.75, 1]} yTicks={[0, 0.25, 0.5, 0.75, 1]} xFormat={pct} yFormat={pct} xLabel="non-callers flagged (false positive rate)" yLabel="callers caught" />
      <path d={area} fill="var(--brand)" opacity="0.08" />
      <line x1={scale.x(0)} y1={scale.y(0)} x2={scale.x(1)} y2={scale.y(1)} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" />
      <path d={toPath(data.roc.oracle)} fill="none" stroke="var(--text-subtle)" strokeWidth="2" strokeDasharray="6 4" />
      <path d={toPath(data.roc.model)} fill="none" stroke="var(--brand)" strokeWidth="3" />
    </ChartFrame>
  );
}

function ScoreHistogram({ data }: { data: Performance }) {
  const { edges, callers, non_callers: nonCallers } = data.score_histogram;
  const maxY = Math.max(...callers, ...nonCallers);
  const scale = makeScale([edges[0], edges[edges.length - 1]], [0, maxY * 1.08]);
  const barWidth = (scale.x(edges[1]) - scale.x(edges[0])) / 2 - 0.5;
  const ticks = [-6, -4, -2, 0, 2, 4, 6].filter((t) => t >= edges[0] && t <= edges[edges.length - 1]);
  return (
    <ChartFrame
      label="Distribution of the log-likelihood gap for callers and non-callers. Callers are shifted to the right."
      legend={<>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-noncallers" />Did not call</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-callers" />Called</span>
        <span className="text-subtle">Right of the line, the model says “likely to call”.</span>
      </>}
    >
      <Axes scale={scale} xTicks={ticks} yTicks={[0, maxY / 2, maxY]} xFormat={(v) => `${v}`} yFormat={(v) => pct(v)} xLabel="log L(callers) − log L(non-callers)" yLabel="share of group" />
      {nonCallers.map((value, i) => (
        <rect key={`n${i}`} x={scale.x(edges[i]) + 0.5} y={scale.y(value)} width={Math.max(0, barWidth)} height={scale.y(0) - scale.y(value)} fill="var(--noncallers)" opacity="0.85" rx="1.5" />
      ))}
      {callers.map((value, i) => (
        <rect key={`c${i}`} x={scale.x(edges[i]) + barWidth + 1} y={scale.y(value)} width={Math.max(0, barWidth)} height={scale.y(0) - scale.y(value)} fill="var(--callers)" opacity="0.85" rx="1.5" />
      ))}
      <line x1={scale.x(0)} x2={scale.x(0)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="var(--text)" strokeWidth="1.5" strokeDasharray="4 3" />
    </ChartFrame>
  );
}

function LengthBars({ data }: { data: Performance }) {
  return (
    <div className="space-y-4">
      {data.by_length.map((bucket) => (
        <div key={bucket.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-semibold">{bucket.label} actions</span>
            <span className="text-xs text-subtle">{formatInteger(bucket.users)} customers · {formatInteger(bucket.callers)} callers</span>
          </div>
          <div className="relative h-7 overflow-hidden rounded-lg bg-surface-2">
            <div className="absolute inset-y-0 left-0 rounded-lg bg-brand/85" style={{ width: `${((bucket.auc_model - 0.5) / 0.5) * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${((bucket.auc_oracle - 0.5) / 0.5) * 100}%` }} title={`Oracle: ${formatDecimal(bucket.auc_oracle, 3)}`} />
            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-white tabular-nums">AUC {formatDecimal(bucket.auc_model, 3)}</span>
          </div>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-subtle">
        Bars start at 0.5 (random). The dark line marks the best possible AUC for that length. Short windows carry little evidence.
      </p>
    </div>
  );
}

function MethodsTable({ data }: { data: Performance }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <caption className="sr-only">Decision methods compared on the test customers</caption>
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-subtle uppercase">
            <th scope="col" className="py-3 pr-4 text-left font-semibold">Method</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Flagged</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Callers caught</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Precision</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Recall</th>
            <th scope="col" className="py-3 text-right font-semibold">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {data.methods.map((method) => (
            <tr key={method.id} className={cx("border-b border-line/70 last:border-0", method.id === "markov" && "bg-brand-soft/60")}>
              <th scope="row" className={cx("py-3 pr-4 text-left font-medium", method.id === "markov" && "font-semibold text-brand")}>{method.label}</th>
              <td className="py-3 pr-4 text-right tabular-nums">{formatInteger(method.flagged)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatInteger(method.callers_caught)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatPercent(method.precision, 1)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatPercent(method.recall, 1)}</td>
              <td className="py-3 text-right tabular-nums text-subtle">{formatPercent(method.accuracy, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfusionMatrix({ data }: { data: Performance }) {
  const c = data.confusion;
  const cells = [
    { label: "Called, flagged", value: c.true_positive, tone: "bg-callers-soft text-callers", hint: "useful calls" },
    { label: "Called, missed", value: c.false_negative, tone: "bg-surface-2 text-muted", hint: "they will call us" },
    { label: "Did not call, flagged", value: c.false_positive, tone: "bg-surface-2 text-muted", hint: "unnecessary calls" },
    { label: "Did not call, not flagged", value: c.true_negative, tone: "bg-noncallers-soft text-noncallers", hint: "correctly left alone" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2" role="table" aria-label="Confusion matrix of the Markov model">
      {cells.map((cell) => (
        <div key={cell.label} role="cell" className={cx("rounded-xl p-4", cell.tone)}>
          <p className="text-2xl font-bold tabular-nums">{formatInteger(cell.value)}</p>
          <p className="text-xs font-semibold">{cell.label}</p>
          <p className="text-xs opacity-80">{cell.hint}</p>
        </div>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const { data, error, retry } = useResource(api.performance);
  const markov = useMemo(() => data?.methods.find((m) => m.id === "markov"), [data]);

  return (
    <div>
      <PageHeader eyebrow="Performance" title="How Well Does It Work?">
        The model is tested on {data ? formatInteger(data.test_set.users) : "10,000"} new synthetic customers it has never seen, and compared
        with simple alternatives and with the best possible model (the oracle, which knows the true process).
      </PageHeader>

      {error && <ErrorState message={error.message} onRetry={retry} />}
      {!data && !error && <LoadingBlock label="Evaluating the model…" />}

      {data && markov && (
        <div className="animate-fade-up space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Ranking quality (AUC)" value={formatDecimal(data.auc.model, 3)} hint={`Oracle ${formatDecimal(data.auc.oracle, 3)} · simple rule ${formatDecimal(data.auc.rule, 3)}`} />
            <Stat label="Callers caught" value={formatPercent(markov.recall)} hint={`${formatInteger(markov.callers_caught)} of ${formatInteger(data.test_set.callers)} callers, by the highest-likelihood rule`} tone="callers" />
            <Stat label="Useful calls" value={formatPercent(markov.precision)} hint={`Of ${formatInteger(markov.flagged)} customers flagged. Random calls: ${formatPercent(data.test_set.call_rate)}`} tone="noncallers" />
            <Stat label="Top 100 calls" value={formatPercent(data.budget.table.find((r) => r.k === 100)?.precision_model)} hint="reach a real caller" tone="ok" />
          </div>

          <BudgetExplorer data={data} />

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <SectionTitle title="Ranking quality" description="How well the model orders callers above non-callers, at every threshold." />
              <RocChart data={data} />
            </Card>
            <Card>
              <SectionTitle title="How the two groups score" description="The gap between the two likelihoods, for test customers who did and did not call." />
              <ScoreHistogram data={data} />
            </Card>
          </div>

          <Card>
            <SectionTitle
              title="Compared with simple alternatives"
              description="Calls are rare, so accuracy is misleading: never calling anyone is 95% accurate and catches no one. Precision and recall tell the real story."
            />
            <MethodsTable data={data} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Where the decisions land" description="The highest-likelihood rule on the test customers." />
              <ConfusionMatrix data={data} />
            </Card>
            <Card>
              <SectionTitle title="Longer windows, better predictions" description="Ranking quality by the number of actions in the window." />
              <LengthBars data={data} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
