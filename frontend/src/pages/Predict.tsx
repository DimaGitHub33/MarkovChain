import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ActionChip, KindLegend } from "../components/ActionChip";
import { useActionLabel, useCatalog } from "../components/CatalogProvider";
import { RunningLikelihoodChart } from "../components/charts/RunningLikelihoodChart";
import { Icon } from "../components/Icon";
import { Badge, Button, Card, ErrorState, IconButton, cx } from "../components/ui";
import { api, type ApiError } from "../lib/api";
import { formatDecimal, formatRatio, pluralize } from "../lib/format";
import { createSequence, decodeSequence, encodeSequence, sequenceActions, sequenceReducer } from "../lib/sequence";
import { EVIDENCE_LABEL, GROUP_LABEL, VERDICT } from "../lib/theme";
import type { Prediction, Step } from "../lib/types";

const EXAMPLES = [
  { label: "Struggling with FX", actions: ["login", "fx_transfer_attempt", "fx_transfer_failed", "fx_transfer_attempt", "fx_transfer_failed", "open_help_page"] },
  { label: "Locked out", actions: ["login", "password_change_attempt", "password_change_failed", "password_change_attempt", "password_change_failed", "open_help_page"] },
  { label: "Everyday banking", actions: ["login", "check_balance", "card_payment", "check_balance", "transfer_to_other_user"] },
];

const EVIDENCE_BARS = { weak: 1, moderate: 2, strong: 3 } as const;

function SequenceBuilder({ actions, maxLength, onRemove, onMove, onReplace }: {
  actions: { id: number; action: string }[];
  maxLength: number;
  onRemove: (index: number) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  onReplace: (index: number, action: string) => void;
}) {
  const { catalog } = useCatalog();
  const [editing, setEditing] = useState<number | null>(null);
  const listEnd = useRef<HTMLLIElement>(null);
  const previousLength = useRef(actions.length);

  useEffect(() => {
    if (actions.length > previousLength.current) listEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    previousLength.current = actions.length;
  }, [actions.length]);

  if (actions.length === 0) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon name="plus" size={22} /></span>
        <p className="font-semibold">Start building a sequence</p>
        <p className="max-w-sm text-sm text-muted">Pick the customer's actions from the palette, in the order they happened — or start from an example.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2.5 rounded-2xl border border-line bg-surface-2/60 p-3.5" aria-label={`Your sequence, ${pluralize(actions.length, "action")}`}>
      {actions.map((item, index) => (
        <li key={item.id} className="animate-pop-in flex items-center gap-1">
          {index > 0 && <Icon name="chevron-right" size={14} className="text-subtle" />}
          <div className="group relative">
            {editing === index ? (
              <select
                autoFocus
                value={item.action}
                aria-label={`Change step ${index + 1}`}
                onChange={(event) => {
                  onReplace(index, event.target.value);
                  setEditing(null);
                }}
                onBlur={() => setEditing(null)}
                onKeyDown={(event) => event.key === "Escape" && setEditing(null)}
                className="h-8 rounded-full border border-brand bg-surface px-3 text-sm font-medium text-ink"
              >
                {catalog.actions.map((action) => (
                  <option key={action.id} value={action.id}>{action.label}</option>
                ))}
              </select>
            ) : (
              <span className="inline-flex items-center rounded-full ring-brand/50 transition group-focus-within:ring-2 group-hover:ring-2">
                <button type="button" onClick={() => setEditing(index)} aria-label={`Step ${index + 1}: ${catalog.actions.find((a) => a.id === item.action)?.label}. Click to change`} className="rounded-full">
                  <ActionChip action={item.action} number={index + 1} />
                </button>
              </span>
            )}
            <span className="pointer-events-none absolute -top-9 left-1/2 z-20 flex -translate-x-1/2 gap-0.5 rounded-lg border border-line bg-surface p-0.5 opacity-0 shadow-card transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
              <IconButton icon="chevron-left" label={`Move step ${index + 1} earlier`} className="size-7" disabled={index === 0} onClick={() => onMove(index, -1)} />
              <IconButton icon="chevron-right" label={`Move step ${index + 1} later`} className="size-7" disabled={index === actions.length - 1} onClick={() => onMove(index, 1)} />
              <IconButton icon="x" label={`Remove step ${index + 1}`} className="size-7 hover:!text-failure" onClick={() => onRemove(index)} />
            </span>
          </div>
        </li>
      ))}
      <li ref={listEnd} className="ml-1 text-xs text-subtle tabular-nums" aria-hidden="true">{actions.length}/{maxLength}</li>
    </ol>
  );
}

function Palette({ disabled, onAdd }: { disabled: boolean; onAdd: (action: string) => void }) {
  const { catalog } = useCatalog();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {catalog.categories.map((category) => (
        <div key={category.id}>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-subtle uppercase">{category.label}</h3>
          <div className="flex flex-col gap-1.5">
            {catalog.actions.filter((action) => action.category === category.id).map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(action.id)}
                title={action.description}
                aria-label={`Add ${action.label}`}
                className={cx(
                  "group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm leading-tight font-medium transition-all",
                  "hover:-translate-y-px hover:shadow-card active:translate-y-0 disabled:pointer-events-none disabled:opacity-45",
                  action.kind === "failure" ? "border-failure/25 bg-failure-soft/60 text-failure hover:border-failure/50"
                    : action.kind === "help" ? "border-help/25 bg-help-soft/60 text-help hover:border-help/50"
                    : "border-line bg-surface text-ink hover:border-line-strong",
                )}
              >
                <Icon name={action.id} size={16} />
                <span className="flex-1">{action.label}</span>
                <Icon name="plus" size={14} className="opacity-0 transition group-hover:opacity-60" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ prediction, stale, loading, error, onRetry }: { prediction: Prediction | null; stale: boolean; loading: boolean; error: ApiError | null; onRetry: () => void }) {
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (!prediction) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line p-6 text-center">
        <Icon name="sparkles" size={26} className="text-brand" />
        <p className="font-semibold">{loading ? "Scoring the sequence…" : "Your prediction will appear here"}</p>
        <p className="max-w-xs text-sm text-muted">Add at least one action and click <strong>Get Prediction</strong>.</p>
      </div>
    );
  }
  const callers = prediction.predicted === "callers";
  const bars = EVIDENCE_BARS[prediction.evidence];
  const winner = prediction.log_likelihood[prediction.predicted];
  const loser = prediction.log_likelihood[callers ? "non_callers" : "callers"];
  return (
    <div className={cx("relative transition-opacity", stale && "opacity-55")} aria-live="polite">
      {stale && (
        <div className="absolute inset-x-0 -top-3 z-10 flex justify-center">
          <Badge tone="warn" icon="info">The sequence changed — click Get Prediction to update</Badge>
        </div>
      )}
      <div className={cx("animate-pop-in overflow-hidden rounded-2xl border-2 p-6", callers ? "border-callers/50 bg-callers-soft" : "border-noncallers/50 bg-noncallers-soft")}>
        <p className="eyebrow !text-subtle">Prediction</p>
        <div className="mt-2 flex items-center gap-3">
          <span className={cx("flex size-12 items-center justify-center rounded-2xl text-white", callers ? "bg-callers" : "bg-noncallers")}>
            <Icon name={callers ? "predict" : "check"} size={24} />
          </span>
          <div>
            <p className={cx("text-2xl font-bold tracking-tight", callers ? "text-callers" : "text-noncallers")}>{VERDICT[prediction.predicted]}</p>
            <p className="text-sm font-medium text-muted">{callers ? "Call this customer first." : "No proactive call needed."}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3].map((level) => (
              <span key={level} className={cx("h-2 w-7 rounded-full", level <= bars ? (callers ? "bg-callers" : "bg-noncallers") : "bg-surface-3")} />
            ))}
          </div>
          <span className="text-sm font-semibold">{EVIDENCE_LABEL[prediction.evidence]}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          This sequence is <strong>{formatRatio(prediction.likelihood_ratio)}</strong> more likely under the{" "}
          {callers ? "callers'" : "non-callers'"} pattern than under the {callers ? "non-callers'" : "callers'"} pattern.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {(["callers", "non_callers"] as const).map((group) => {
          const win = group === prediction.predicted;
          return (
            <div key={group} className={cx("rounded-xl border p-3", win ? (group === "callers" ? "border-callers/50" : "border-noncallers/50") : "border-line")}>
              <dt className="text-xs text-muted">log L · {GROUP_LABEL[group]}' model</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold tabular-nums">{formatDecimal(prediction.log_likelihood[group])}</span>
                {win && <span className={cx("text-xs font-semibold", group === "callers" ? "text-callers" : "text-noncallers")}>highest</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        The gap is {formatDecimal(winner - loser)} in log-likelihood. Evidence is weak below 3×, moderate up to 20×, and strong above.
      </p>
    </div>
  );
}

function StepByStep({ prediction }: { prediction: Prediction }) {
  const labelOf = useActionLabel();
  const rare = prediction.steps.filter((step) => step.rare).length;
  return (
    <Card className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">How was this decided?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Each step adds its log-probability under each model. Colours show which pattern each step points to.</p>
        </div>
        {rare > 0 && <Badge tone="warn" icon="alert">{pluralize(rare, "rare transition")}</Badge>}
      </div>

      <ol className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-3" aria-label="Evidence from each step">
        {prediction.steps.map((step, index) => (
          <li key={step.position} className="flex items-center gap-1">
            {index > 0 && <TransitionPill step={step} />}
            <ActionChip action={step.to} number={step.position} size="sm" />
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <RunningLikelihoodChart steps={prediction.steps} labelOf={labelOf} />
        <div className="max-h-80 overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Log-probability of each step under each model</caption>
            <thead className="sticky top-0 bg-surface-2 text-xs text-subtle">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">#</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Step</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-callers">Callers</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-noncallers">Non-callers</th>
              </tr>
            </thead>
            <tbody>
              {prediction.steps.map((step) => (
                <tr key={step.position} className="border-t border-line/70">
                  <td className="px-3 py-2 tabular-nums text-subtle">{step.position}</td>
                  <td className="px-3 py-2">
                    <span className="text-ink">{step.from ? `${labelOf(step.from)} → ${labelOf(step.to)}` : `Start: ${labelOf(step.to)}`}</span>
                    {step.rare && <span className="ml-1.5 text-xs font-semibold text-warn" title="Seen fewer than 5 times in training; its probability relies mostly on smoothing.">rare</span>}
                  </td>
                  <td className={cx("px-3 py-2 text-right tabular-nums", step.favours === "callers" && "font-semibold text-callers")}>{formatDecimal(step.log_probability.callers)}</td>
                  <td className={cx("px-3 py-2 text-right tabular-nums", step.favours === "non_callers" && "font-semibold text-noncallers")}>{formatDecimal(step.log_probability.non_callers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rare > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-subtle">
          A rare transition was seen fewer than 5 times in training for at least one group, so its probability relies mostly on smoothing.
        </p>
      )}
    </Card>
  );
}

function TransitionPill({ step }: { step: Step }) {
  const diff = step.log_probability.callers - step.log_probability.non_callers;
  const ratio = Math.exp(Math.abs(diff));
  const neutral = ratio < 1.25;
  const callers = diff > 0;
  return (
    <span
      className={cx(
        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums",
        neutral ? "text-subtle" : callers ? "bg-callers-soft text-callers" : "bg-noncallers-soft text-noncallers",
        step.rare && "ring-1 ring-warn",
      )}
      title={neutral ? "About equally likely in both groups" : `${ratio.toFixed(1)}× more likely for ${callers ? "callers" : "non-callers"}`}
    >
      {neutral ? <Icon name="arrow-right" size={12} /> : <>{ratio.toFixed(1)}×<Icon name="arrow-right" size={11} /></>}
      <span className="sr-only">{neutral ? "neutral step" : `${ratio.toFixed(1)} times more likely for ${callers ? "callers" : "non-callers"}`}</span>
    </span>
  );
}

export default function PredictPage() {
  const { catalog, summary } = useCatalog();
  const maxLength = summary.max_sequence_length;
  const [params, setParams] = useSearchParams();
  const known = useMemo(() => new Set(catalog.actions.map((a) => a.id)), [catalog]);
  const [state, dispatch] = useReducer(sequenceReducer, undefined, () => createSequence(decodeSequence(params.get("seq"), known, maxLength), maxLength));
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);
  const actions = sequenceActions(state);
  const key = encodeSequence(actions);
  const stale = prediction !== null && encodeSequence(prediction.actions) !== key;
  const full = actions.length >= maxLength;

  // Keep the sequence in the URL, so it can be shared and survives a refresh.
  useEffect(() => {
    setParams(key ? { seq: key } : {}, { replace: true });
  }, [key, setParams]);

  const predict = useCallback(async () => {
    if (actions.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setPrediction(await api.predict(actions));
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setLoading(false);
    }
  }, [actions]);

  // Score a shared link right away.
  const autoRun = useRef(actions.length > 0);
  useEffect(() => {
    if (autoRun.current) {
      autoRun.current = false;
      void predict();
    }
  }, [predict]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !(event.target instanceof HTMLSelectElement)) {
        event.preventDefault();
        dispatch({ type: "undo" });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void predict();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [predict]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <header className="animate-fade-up mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Predict</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Will This Customer Call?</h1>
          <p className="mt-3 text-lg text-muted">Build what the customer did in the last two hours, in order, and get a prediction.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-subtle">Examples:</span>
          {EXAMPLES.map((example) => (
            <Button key={example.label} size="sm" variant="secondary" onClick={() => dispatch({ type: "load", actions: example.actions })}>
              {example.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1fr)]">
        <Card className="animate-fade-up !p-5 sm:!p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Customer's actions <span className="font-normal text-subtle">· {pluralize(actions.length, "action")}</span></h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" icon="undo" onClick={() => dispatch({ type: "undo" })} disabled={state.history.length === 0} title="Undo (Ctrl+Z)">Undo</Button>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => dispatch({ type: "reset" })} disabled={actions.length === 0}>Clear</Button>
              <IconButton icon={copied ? "check" : "link"} label={copied ? "Link copied" : "Copy a link to this sequence"} onClick={copyLink} disabled={actions.length === 0} />
            </div>
          </div>
          <SequenceBuilder
            actions={state.items}
            maxLength={maxLength}
            onRemove={(index) => dispatch({ type: "remove", index })}
            onMove={(index, offset) => dispatch({ type: "move", index, offset })}
            onReplace={(index, action) => dispatch({ type: "replace", index, action })}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <KindLegend />
            <p className="text-xs text-subtle">Click a step to change it · hover or focus it to move or remove it</p>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add an action</h2>
              {full && <Badge tone="warn" icon="alert">Maximum of {maxLength} actions reached</Badge>}
            </div>
            <Palette disabled={full} onAdd={(action) => dispatch({ type: "add", action })} />
          </div>
        </Card>

        <div id="prediction-result" className="space-y-4 lg:sticky lg:top-8">
          <Button
            variant="primary"
            size="lg"
            icon="zap"
            className="w-full"
            onClick={predict}
            disabled={actions.length === 0 || loading}
            title="Get Prediction (Ctrl+Enter)"
          >
            {loading ? "Scoring…" : stale ? "Update Prediction" : "Get Prediction"}
          </Button>
          <ResultCard prediction={prediction} stale={stale} loading={loading} error={error} onRetry={predict} />
          {prediction && actions.length === 1 && !stale && (
            <p className="flex gap-2 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              <Icon name="info" size={16} className="shrink-0 text-brand" />
              With a single action there are no transitions, so the two groups are hard to tell apart. Add more actions.
            </p>
          )}
        </div>
      </div>

      {prediction && !stale && <div className="mt-8"><StepByStep prediction={prediction} /></div>}

      {/* On small screens the result column sits below the palette, so keep the main action within reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {prediction && !stale ? (
            <button
              type="button"
              onClick={() => document.getElementById("prediction-result")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className={cx("min-w-0 flex-1 truncate text-left text-sm font-semibold", prediction.predicted === "callers" ? "text-callers" : "text-noncallers")}
            >
              {VERDICT[prediction.predicted]} · {EVIDENCE_LABEL[prediction.evidence].toLowerCase()}
            </button>
          ) : (
            <span className="flex-1 text-sm text-muted">{pluralize(actions.length, "action")}</span>
          )}
          <Button variant="primary" icon="zap" onClick={predict} disabled={actions.length === 0 || loading}>
            {loading ? "Scoring…" : stale ? "Update" : "Predict"}
          </Button>
        </div>
      </div>
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </div>
  );
}
