const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatInteger(value: number): string {
  return integer.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits);
}

/** "22×", "1.5×", "3,200×", "> 1M×" — how many times more likely. */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio >= 1e6) return "over 1,000,000×";
  if (ratio < 10) return `${ratio.toFixed(1)}×`;
  return `${integer.format(Math.round(ratio))}×`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}
