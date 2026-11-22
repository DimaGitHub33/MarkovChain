import type { ReactNode } from "react";
import { useCatalog } from "../components/CatalogProvider";
import { Icon } from "../components/Icon";
import { Math } from "../components/Math";
import { Badge, Card, PageHeader, SectionTitle, cx } from "../components/ui";
import { formatInteger, formatPercent } from "../lib/format";

type Tone = "neutral" | "callers" | "noncallers" | "model" | "decision";

const TONE: Record<Tone, string> = {
  neutral: "border-line bg-surface",
  callers: "border-callers/40 bg-callers-soft",
  noncallers: "border-noncallers/40 bg-noncallers-soft",
  model: "border-brand/40 bg-brand-soft",
  decision: "border-warn/40 bg-warn-soft",
};

function Node({ code, title, tone = "neutral", children }: { code: string; title: ReactNode; tone?: Tone; children: ReactNode }) {
  return (
    <div className={cx("relative h-full rounded-2xl border p-4 shadow-card", TONE[tone])}>
      <p className="text-[0.7rem] font-bold tracking-wider text-subtle uppercase">{code}</p>
      <h3 className="mt-1 font-semibold leading-snug">{title}</h3>
      <div className="mt-1.5 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

/** A connector between steps: vertical when stacked, horizontal from the `wide` breakpoint ("never" keeps it vertical). */
function Arrow({ label, wide = "lg" }: { label?: string; wide?: "lg" | "xl" | "never" }) {
  const row = { lg: "lg:flex-row", xl: "xl:flex-row", never: "" }[wide];
  const line = { lg: "lg:h-px lg:w-5", xl: "xl:h-px xl:w-5", never: "" }[wide];
  const icon = { lg: "lg:mt-0 lg:-ml-1 lg:-rotate-90", xl: "xl:mt-0 xl:-ml-1 xl:-rotate-90", never: "" }[wide];
  return (
    <div className="flex items-center justify-center py-1 text-subtle" aria-hidden="true">
      <div className={cx("flex flex-col items-center gap-1", row)}>
        <span className={cx("h-4 w-px bg-line-strong", line)} />
        {label && <span className="rounded-md bg-surface px-1.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap">{label}</span>}
        <Icon name="chevron-down" size={16} className={cx("-mt-1", icon)} />
      </div>
    </div>
  );
}

function PhaseFrame({ phase, title, subtitle, tone, children }: { phase: string; title: string; subtitle: string; tone: "a" | "b"; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`phase-${tone}`}
      className={cx(
        "rounded-[1.75rem] border border-dashed p-4 sm:p-7",
        tone === "a" ? "border-warn/45 bg-warn-soft/45" : "border-noncallers/40 bg-noncallers-soft/45",
      )}
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={tone === "a" ? "warn" : "noncallers"}>{phase}</Badge>
        <h2 id={`phase-${tone}`} className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="w-full text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function GroupLane({ group, label, test }: { group: "callers" | "noncallers"; label: string; test: string }) {
  const sub = group === "callers" ? String.raw`\text{call}` : String.raw`\text{no call}`;
  return (
    <div className={cx("flex flex-col gap-1 rounded-2xl border border-dashed p-3", group === "callers" ? "border-callers/40" : "border-noncallers/40")}>
      <div className={cx("rounded-xl px-4 py-2.5 text-center font-semibold", group === "callers" ? "bg-callers-soft text-callers" : "bg-noncallers-soft text-noncallers")}>
        {label} <span className="font-mono text-xs opacity-80">({test})</span>
      </div>
      <Arrow wide="never" />
      <Node code="A4" title="Count transitions" tone={group}>
        Count <Math tex={String.raw`i \to j`} /> inside each customer's sequence, then normalize each row into probabilities.
      </Node>
      <Arrow wide="never" />
      <Node code="A5" title={<>Transition matrix <Math tex={`A_{${sub}}`} /></>} tone="model">
        11 × 11, each row sums to 1, plus a first-action distribution <Math tex={`\\pi_{${sub}}`} />.
      </Node>
    </div>
  );
}

export default function HowItWorksPage() {
  const { summary } = useCatalog();
  const callers = summary.groups.find((group) => group.id === "callers")!;
  return (
    <div>
      <PageHeader eyebrow="The process" title="How the Model Works">
        Two phases. First the model learns one pattern per group from customers whose outcome is known. Then it compares a new
        customer's actions with both patterns.
      </PageHeader>

      <div className="animate-fade-up space-y-5">
        <PhaseFrame phase="Phase A" title="Build the models" subtitle="Customers whose outcome is already known." tone="a">
          <div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Node code="A1" title="Collect events">All customers' actions in two-hour windows.</Node>
            <Arrow label="events" />
            <Node code="A2" title="Build sequences">One sequence per customer, in time order. Each event becomes one of 11 actions.</Node>
            <Arrow label="sequences" />
            <Node code="A3" title="Split by label" tone="decision">Did the customer call customer care after the window?</Node>
          </div>
          <div className="my-3 flex items-center justify-center gap-4 text-xs font-semibold" aria-hidden="true">
            <span className="flex items-center gap-1.5 rounded-full bg-callers-soft px-3 py-1 text-callers"><Icon name="chevron-down" size={14} />Yes → callers</span>
            <span className="flex items-center gap-1.5 rounded-full bg-noncallers-soft px-3 py-1 text-noncallers"><Icon name="chevron-down" size={14} />No → non-callers</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
            <GroupLane group="callers" label="Callers" test="called = 1" />
            <GroupLane group="noncallers" label="Non-callers" test="called = 0" />
            <Card className="!p-5">
              <h3 className="font-semibold">Each group's model = (π, A)</h3>
              <div className="mt-3 text-sm">
                <Math display tex={String.raw`A(i,j)=\frac{N(i\to j)+\alpha}{\sum_k N(i\to k)+K\alpha}`} />
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                <li>K = 11 actions. Transitions are counted inside each sequence, never across customers.</li>
                <li>α = β = 1 (Laplace smoothing): an unseen transition gets a small probability, not zero.</li>
                <li>
                  Training data: {formatInteger(summary.training.users)} synthetic customers, {formatInteger(callers.training_users)} of
                  them callers ({formatPercent(summary.training.call_rate)}).
                </li>
              </ul>
            </Card>
          </div>
        </PhaseFrame>

        <div className="flex items-center justify-center gap-3 text-sm font-semibold text-brand" aria-hidden="true">
          <span className="h-px w-10 bg-brand/40 sm:w-20" />
          <span className="flex items-center gap-1.5">Both matrices feed phase B <Icon name="chevron-down" size={16} /></span>
          <span className="h-px w-10 bg-brand/40 sm:w-20" />
        </div>

        <PhaseFrame phase="Phase B" title="Classify a customer" subtitle="A new customer whose outcome is unknown." tone="b">
          <div className="grid xl:grid-cols-[0.85fr_auto_0.85fr_auto_1.7fr_auto_0.95fr]">
            <Node code="B1" title="Get the customer">Collect the customer's actions from the last two hours.</Node>
            <Arrow label="events" wide="xl" />
            <Node code="B2" title="Build the sequence">Same time ordering and the same 11 actions as in A2.</Node>
            <Arrow label="x₁ … xₙ" wide="xl" />
            <div className="rounded-2xl border-2 border-dashed border-brand/45 bg-surface/60 p-3">
              <p className="mb-2 px-1 text-[0.7rem] font-bold tracking-wider text-subtle uppercase">B3 · Likelihood under each model</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Node code="Callers' model" title={<Math tex={String.raw`\log L_{\text{call}}`} />} tone="callers">
                  uses <Math tex={String.raw`A_{\text{call}},\ \pi_{\text{call}}`} />
                </Node>
                <Node code="Non-callers' model" title={<Math tex={String.raw`\log L_{\text{no call}}`} />} tone="noncallers">
                  uses <Math tex={String.raw`A_{\text{no call}},\ \pi_{\text{no call}}`} />
                </Node>
              </div>
            </div>
            <Arrow wide="xl" />
            <Node code="B4 · B5" title="Compare and assign" tone="decision">
              The highest likelihood wins.
              <span className="mt-2.5 flex flex-col gap-1.5">
                <span className="rounded-lg bg-callers-soft px-2 py-1 text-xs font-semibold text-callers">Callers higher → call first</span>
                <span className="rounded-lg bg-noncallers-soft px-2 py-1 text-xs font-semibold text-noncallers">Otherwise or tie → no call</span>
              </span>
            </Node>
          </div>
        </PhaseFrame>
      </div>

      <section className="mt-12">
        <SectionTitle title="The process vs. this implementation" description="What a production version would still need." />
        <div className="grid gap-4 md:grid-cols-2">
          {NOTES.map((note) => (
            <Card key={note.title} className="!p-5">
              <h3 className="flex items-center gap-2 font-semibold"><Icon name="info" size={18} className="text-brand" />{note.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{note.text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/docs/model-process.drawio" download className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-line-strong">
            <Icon name="download" size={16} /> Diagram source (draw.io)
          </a>
          <a href="/docs/model-process.png" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-line-strong">
            <Icon name="download" size={16} /> Diagram image (PNG)
          </a>
        </div>
      </section>
    </div>
  );
}

const NOTES = [
  { title: "The training window", text: "The label is known only after the window, so in production phase A must use past windows. Only phase B uses the last two hours." },
  { title: "No real event log yet", text: "The data is synthetic and each sequence is generated already in order, so the two-hour window and the time sorting are not implemented." },
  { title: "Defining the label", text: "In the synthetic data the label is drawn first and then drives the actions. With real data, “called” must mean a call within a fixed time after the window." },
  { title: "Decision details", text: "The decision uses the likelihood only, without how common calls are. A tie goes to “unlikely to call”. Unknown actions are rejected with a clear error." },
];
