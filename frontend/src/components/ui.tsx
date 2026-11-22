import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
export { cx };

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-solid text-white shadow-[0_8px_20px_-8px_rgb(79_70_229/0.7)] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "text-failure hover:bg-failure-soft",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
}

export function Button({ variant = "secondary", size = "md", icon, className, children, ...props }: ButtonProps) {
  const sizes = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2.5" };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        BUTTON_STYLES[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "lg" ? 20 : 16} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  size?: number;
}

/** An icon-only button. The label is read by screen readers and shown as a tooltip. */
export function IconButton({ icon, label, size = 16, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors",
        "hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("card p-6 sm:p-7", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="animate-fade-up mb-8 max-w-3xl">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {children && <div className="mt-4 text-lg leading-relaxed text-muted text-pretty">{children}</div>}
    </header>
  );
}

export function SectionTitle({ title, description, right }: { title: string; description?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {right}
    </div>
  );
}

type Tone = "neutral" | "brand" | "callers" | "noncallers" | "ok" | "warn" | "failure";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  brand: "bg-brand-soft text-brand border-transparent",
  callers: "bg-callers-soft text-callers border-transparent",
  noncallers: "bg-noncallers-soft text-noncallers border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  failure: "bg-failure-soft text-failure border-transparent",
};

export function Badge({ tone = "neutral", icon, children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A radio group styled as a segmented control. Arrow keys move between options. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
              selected ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

export function LoadingBlock({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cx("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-failure/30 bg-failure-soft p-5 text-sm">
      <p className="flex items-center gap-2 font-semibold text-failure">
        <Icon name="alert" size={18} /> Something went wrong
      </p>
      <p className="text-ink">{message}</p>
      {onRetry && (
        <Button size="sm" icon="undo" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  const accent: Record<Tone, string> = {
    neutral: "text-ink", brand: "text-brand", callers: "text-callers", noncallers: "text-noncallers",
    ok: "text-ok", warn: "text-warn", failure: "text-failure",
  };
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={cx("mt-2 text-3xl font-bold tracking-tight tabular-nums", accent[tone])}>{value}</p>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-subtle">{hint}</p>}
    </div>
  );
}
