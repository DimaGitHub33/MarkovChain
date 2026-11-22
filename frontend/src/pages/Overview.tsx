import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChipSequence } from "../components/ActionChip";
import { Icon } from "../components/Icon";
import { Math } from "../components/Math";
import { Card, SectionTitle } from "../components/ui";

const QUIET_USER = ["login", "check_balance", "card_payment", "check_balance", "transfer_to_other_user"];
const STRUGGLING_USER = ["login", "fx_transfer_attempt", "fx_transfer_failed", "fx_transfer_attempt", "fx_transfer_failed", "open_help_page"];

const STEPS = [
  { title: "Collect labelled history", text: "Take past two-hour windows of customer actions, and record whether each customer called afterwards." },
  { title: "Build a sequence per customer", text: "List each customer's actions in the order they happened." },
  { title: "Split into two groups", text: "Callers and non-callers. Each group gets its own model." },
  { title: "Learn what comes next", text: "In each group, count how often each action follows each other action, and turn the counts into probabilities: a transition matrix." },
  { title: "Predict", text: "For a customer active in the last two hours, check which group's pattern explains their actions best. If it is the callers' pattern, call them first." },
];

export function OverviewPage() {
  return (
    <div className="space-y-14">
      <section className="animate-fade-up grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="eyebrow mb-4">Customer care · Markov chains</p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
            Predicting Customer Care Calls
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted text-pretty">
            Customers call when something goes wrong. Their last two hours of activity usually show it. This app finds
            the customers who are likely to call, so the call center can <strong className="text-ink">call them first</strong>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/predict" className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-brand-solid px-6 font-semibold text-white shadow-[0_10px_30px_-10px_rgb(79_70_229/0.8)] transition hover:brightness-110">
              <Icon name="zap" size={18} /> Try a prediction
            </Link>
            <Link to="/how-it-works" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-6 font-semibold transition hover:border-line-strong">
              How it works <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
        <div className="card relative overflow-hidden p-6">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-callers/15 blur-3xl" aria-hidden="true" />
          <p className="text-sm font-semibold text-muted">Two customers, two stories</p>
          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-noncallers">
                <span className="size-2 rounded-full bg-noncallers" /> Probably will not call
              </p>
              <ChipSequence actions={QUIET_USER} />
            </div>
            <div className="border-t border-line pt-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-callers">
                <span className="size-2 rounded-full bg-callers" /> Probably will call
              </p>
              <ChipSequence actions={STRUGGLING_USER} />
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            The second customer fails, retries, fails again and looks for help — a pattern typical of customers who are
            about to call.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle
          title="The method"
          description="A generative classifier: each group has its own model of how its customers behave."
          right={
            <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              See the process diagram <Icon name="arrow-right" size={16} />
            </Link>
          }
        />
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card p-5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{index + 1}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle title="The math" description="Three formulas are all the model needs." />
        <div className="space-y-4">
          {FORMULAS.map((formula, index) => (
            <Card key={formula.title} className="grid items-center gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <Math display label={formula.label} tex={formula.tex} />
              <div>
                <h3 className="flex items-center gap-2.5 font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-xs font-bold text-brand">{index + 1}</span>
                  {formula.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{formula.text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

const FORMULAS: { title: string; label: string; tex: string; text: ReactNode }[] = [
  {
    title: "Transition matrix of group c",
    label: "Transition probability formula",
    tex: String.raw`A_c(i,j)=\frac{N_c(i\to j)+\alpha}{\sum_k N_c(i\to k)+K\alpha}`,
    text: (
      <>
        <Math tex={String.raw`N_c(i\to j)`} /> counts how often action <Math tex="j" /> follows action <Math tex="i" /> in group{" "}
        <Math tex="c" />, and <Math tex="K = 11" /> is the number of actions. Adding <Math tex={String.raw`\alpha = 1`} /> (Laplace smoothing)
        keeps unseen transitions above zero.
      </>
    ),
  },
  {
    title: "Log-likelihood of a sequence",
    label: "Log-likelihood formula",
    tex: String.raw`\log L_c=\log\pi_c(x_1)+\sum_{t=1}^{n-1}\log A_c(x_t,x_{t+1})`,
    text: (
      <>
        <Math tex={String.raw`\pi_c`} /> is the probability of the first action. Logarithms turn a long product of small probabilities into a
        sum, so the numbers never underflow.
      </>
    ),
  },
  {
    title: "Prediction",
    label: "Prediction formula",
    tex: String.raw`\hat c=\arg\max_{c\,\in\,\{\text{callers},\,\text{non-callers}\}}\log L_c`,
    text: (
      <>
        The customer joins the group whose model explains the sequence best. The gap between the two likelihoods tells how strong the
        evidence is.
      </>
    ),
  },
];
