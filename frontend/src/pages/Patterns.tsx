import { useMemo, useState } from "react";
import { ActionChip } from "../components/ActionChip";
import { useCatalog } from "../components/CatalogProvider";
import { Heatmap, HeatmapLegend, type HeatmapCell } from "../components/charts/Heatmap";
import { Icon } from "../components/Icon";
import { Badge, Card, ErrorState, LoadingBlock, PageHeader, SectionTitle, Segmented, cx } from "../components/ui";
import { api, useResource } from "../lib/api";
import { formatInteger, formatPercent } from "../lib/format";
import type { GroupId, Patterns } from "../lib/types";

type View = GroupId | "difference";
type Source = "true" | "learned";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "callers", label: "Callers" },
  { value: "non_callers", label: "Non-callers" },
  { value: "difference", label: "Difference" },
];

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "learned", label: "Learned from data" },
  { value: "true", label: "True process" },
];

const VIEW_TEXT: Record<View, string> = {
  callers: "What customers who called usually do next. Each row is the current action and sums to 100%.",
  non_callers: "What customers who did not call usually do next. Each row is the current action and sums to 100%.",
  difference: "Callers minus non-callers. Orange cells are transitions more typical for callers, blue cells for non-callers.",
};

const probability = (value: number) => `${Math.round(value * 100)}`;
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.round(Math.abs(value) * 100)}`;

function CellDetails({ patterns, source, cell }: { patterns: Patterns; source: Source; cell: HeatmapCell | null }) {
  const { byId } = useCatalog();
  if (!cell) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
        <Icon name="target" size={22} className="text-brand" />
        Hover, click or use the arrow keys on a cell to see its details.
      </div>
    );
  }
  const from = patterns.actions[cell.row];
  const to = patterns.actions[cell.col];
  const chains = patterns[source];
  const callers = chains.callers.transitions[cell.row][cell.col];
  const nonCallers = chains.non_callers.transitions[cell.row][cell.col];
  const ratio = callers / nonCallers;
  const counts = patterns.learned;
  return (
    <div className="animate-pop-in space-y-5" aria-live="polite">
      <div>
        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Transition</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionChip action={from} size="sm" />
          <Icon name="arrow-right" size={16} className="text-subtle" />
          <ActionChip action={to} size="sm" />
        </div>
        <p className="mt-2 text-sm text-muted">
          After <strong className="text-ink">{byId.get(from)?.label}</strong>, how often is the next action{" "}
          <strong className="text-ink">{byId.get(to)?.label}</strong>?
        </p>
      </div>
      <div className="space-y-3">
        {([["callers", callers], ["non_callers", nonCallers]] as const).map(([group, value]) => (
          <div key={group}>
            <div className="flex justify-between text-sm">
              <span className={group === "callers" ? "font-semibold text-callers" : "font-semibold text-noncallers"}>
                {group === "callers" ? "Callers" : "Non-callers"}
              </span>
              <span className="font-semibold tabular-nums">{formatPercent(value, 1)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
              <div className={cx("h-full rounded-full transition-all", group === "callers" ? "bg-callers" : "bg-noncallers")} style={{ width: `${Math.min(100, value * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-surface-2 p-3 text-sm">
        {ratio >= 1.1 ? (
          <p><strong className="text-callers">{ratio.toFixed(1)}× more likely</strong> for callers.</p>
        ) : ratio <= 1 / 1.1 ? (
          <p><strong className="text-noncallers">{(1 / ratio).toFixed(1)}× more likely</strong> for non-callers.</p>
        ) : (
          <p className="text-muted">About equally likely in both groups — this step barely affects the prediction.</p>
        )}
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        Seen in training: {formatInteger(counts.callers.transition_counts![cell.row][cell.col])} times among callers,{" "}
        {formatInteger(counts.non_callers.transition_counts![cell.row][cell.col])} times among non-callers.
      </p>
    </div>
  );
}

function ActionsTable({ patterns }: { patterns: Patterns }) {
  const { catalog } = useCatalog();
  const shares = patterns.true;
  const maxShare = Math.max(...shares.callers.stationary, ...shares.non_callers.stationary);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <caption className="sr-only">The actions, what they mean, and their share of all actions in a long session of each group</caption>
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-subtle uppercase">
            <th scope="col" className="py-3 pr-4 font-semibold">Action</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Meaning</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Share · callers</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Share · non-callers</th>
            <th scope="col" className="py-3 font-semibold">Typical for</th>
          </tr>
        </thead>
        <tbody>
          {catalog.actions.map((action) => {
            const index = patterns.actions.indexOf(action.id);
            const typical = patterns.typical_for[action.id];
            return (
              <tr key={action.id} className="border-b border-line/70 last:border-0">
                <td className="py-3 pr-4"><ActionChip action={action.id} size="sm" /></td>
                <td className="py-3 pr-4 text-muted">{action.description}</td>
                {(["callers", "non_callers"] as const).map((group) => (
                  <td key={group} className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                        <div className={group === "callers" ? "h-full bg-callers" : "h-full bg-noncallers"} style={{ width: `${(shares[group].stationary[index] / maxShare) * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-muted">{formatPercent(shares[group].stationary[index], 1)}</span>
                    </div>
                  </td>
                ))}
                <td className="py-3">
                  {typical === "callers" ? <Badge tone="callers">Callers</Badge> : typical === "non_callers" ? <Badge tone="noncallers">Non-callers</Badge> : <Badge>Both</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PatternsPage() {
  const { data: patterns, error, retry } = useResource(api.patterns);
  const { byId } = useCatalog();
  const [view, setView] = useState<View>("difference");
  const [source, setSource] = useState<Source>("learned");
  const [cell, setCell] = useState<HeatmapCell | null>(null);

  const matrix = useMemo(() => {
    if (!patterns) return null;
    const chains = patterns[source];
    if (view !== "difference") return chains[view].transitions;
    return chains.callers.transitions.map((row, i) => row.map((value, j) => value - chains.non_callers.transitions[i][j]));
  }, [patterns, source, view]);

  const max = useMemo(() => {
    if (!patterns || !matrix) return 1;
    if (view === "difference") return Math.max(...matrix.flat().map(Math.abs));
    const chains = patterns[source];
    return Math.max(...chains.callers.transitions.flat(), ...chains.non_callers.transitions.flat());
  }, [patterns, matrix, source, view]);

  const labels = useMemo(() => patterns?.actions.map((id) => byId.get(id)?.label ?? id) ?? [], [patterns, byId]);

  return (
    <div>
      <PageHeader eyebrow="Behavior patterns" title="How Callers and Non-callers Behave">
        Each group has its own transition matrix: the chance of every next action, given the current one. The differences between
        the two matrices are what the model uses to tell the groups apart.
      </PageHeader>

      {error && <ErrorState message={error.message} onRetry={retry} />}
      {!patterns && !error && <LoadingBlock label="Loading the transition matrices…" />}

      {patterns && matrix && (
        <div className="space-y-8">
          <Card className="animate-fade-up">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <Segmented label="Matrix to show" value={view} options={VIEW_OPTIONS} onChange={setView} />
              <Segmented label="Source of the matrix" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
            </div>
            <p className="mb-2 max-w-3xl text-sm leading-relaxed text-muted">{VIEW_TEXT[view]}</p>
            <p className="mb-6 max-w-3xl text-xs leading-relaxed text-subtle">
              {source === "learned"
                ? "Learned from 20,000 synthetic customers — what the model actually uses."
                : "The hidden process that generated the data. A real project would only have the learned matrices."}{" "}
              Values are percentages; cells below {view === "difference" ? "5 points" : "10%"} are left blank.
            </p>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <Heatmap
                  values={matrix}
                  rowLabels={labels}
                  colLabels={labels}
                  mode={view === "difference" ? "diverging" : "sequential"}
                  max={max}
                  caption={`Transition matrix: ${VIEW_OPTIONS.find((o) => o.value === view)!.label}, ${source === "learned" ? "learned" : "true"}`}
                  format={view === "difference" ? signed : probability}
                  labelThreshold={view === "difference" ? 0.05 : 0.1}
                  selected={cell}
                  onSelect={setCell}
                />
                <div className="mt-4">
                  {view === "difference" ? (
                    <HeatmapLegend mode="diverging" max={max} format={signed} lowLabel="Non-callers" highLabel="Callers" />
                  ) : (
                    <HeatmapLegend mode="sequential" max={max} format={probability} lowLabel="Rare" highLabel="Common" />
                  )}
                </div>
              </div>
              <aside aria-label="Selected transition" className="xl:border-l xl:border-line xl:pl-8">
                <CellDetails patterns={patterns} source={source} cell={cell} />
              </aside>
            </div>
          </Card>

          <section>
            <SectionTitle
              title="The actions"
              description="What each action means, and its share of all actions in a long session of each group (the stationary distribution of the true matrices)."
            />
            <Card className="!py-2"><ActionsTable patterns={patterns} /></Card>
          </section>
        </div>
      )}
    </div>
  );
}
