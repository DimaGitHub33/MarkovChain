import { useState, type KeyboardEvent } from "react";
import { useTheme } from "../ThemeProvider";
import { cx } from "../ui";
import { divergingColor, sequentialColor, type CellColor } from "../../lib/theme";

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
}

interface HeatmapProps {
  values: number[][];
  rowLabels: string[];
  colLabels: string[];
  mode: "sequential" | "diverging";
  max: number;
  caption: string;
  format: (value: number) => string;
  labelThreshold: number;
  selected: HeatmapCell | null;
  onSelect: (cell: HeatmapCell) => void;
}

/**
 * A matrix as a grid of buttons: hover, click or use the arrow keys to inspect a cell.
 * Rows are the current action, columns the next action.
 */
export function Heatmap({ values, rowLabels, colLabels, mode, max, caption, format, labelThreshold, selected, onSelect }: HeatmapProps) {
  const { theme } = useTheme();
  const [focus, setFocus] = useState({ row: 0, col: 0 });
  const size = values.length;

  const colorOf = (value: number): CellColor =>
    mode === "sequential" ? sequentialColor(value, max, theme) : divergingColor(value, max, theme);

  const select = (row: number, col: number) => {
    setFocus({ row, col });
    onSelect({ row, col, value: values[row][col] });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Home: [0, -col], End: [0, size - 1 - col],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const next = { row: Math.min(size - 1, Math.max(0, row + move[0])), col: Math.min(size - 1, Math.max(0, col + move[1])) };
    select(next.row, next.col);
    const grid = event.currentTarget.closest("[role=grid]");
    grid?.querySelector<HTMLButtonElement>(`[data-cell="${next.row}-${next.col}"]`)?.focus();
  };

  return (
    <div className="overflow-x-auto pr-12 pb-2">
      <div role="grid" aria-label={caption} className="inline-grid min-w-full gap-[3px]" style={{ gridTemplateColumns: `minmax(8.5rem, max-content) repeat(${size}, minmax(2.6rem, 1fr))` }}>
        <div role="row" className="contents">
          <div role="columnheader" className="flex items-end pb-1 text-[0.68rem] font-semibold tracking-wide text-subtle uppercase">
            from ↓ · to →
          </div>
          {colLabels.map((label, col) => (
            <div key={label} role="columnheader" title={label} className="flex h-36 items-end justify-center pb-1">
              <span className={cx("origin-bottom-left translate-x-1/2 -rotate-[55deg] text-xs whitespace-nowrap transition-colors", selected?.col === col ? "font-semibold text-ink" : "text-muted")}>
                {label}
              </span>
            </div>
          ))}
        </div>
        {values.map((row, rowIndex) => (
          <div key={rowLabels[rowIndex]} role="row" className="contents">
            <div role="rowheader" className={cx("flex items-center justify-end pr-2 text-right text-xs transition-colors", selected?.row === rowIndex ? "font-semibold text-ink" : "text-muted")}>
              {rowLabels[rowIndex]}
            </div>
            {row.map((value, colIndex) => {
              const color = colorOf(value);
              const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
              const inCross = selected && (selected.row === rowIndex || selected.col === colIndex);
              return (
                <button
                  key={colIndex}
                  type="button"
                  role="gridcell"
                  data-cell={`${rowIndex}-${colIndex}`}
                  tabIndex={focus.row === rowIndex && focus.col === colIndex ? 0 : -1}
                  aria-selected={isSelected}
                  aria-label={`${rowLabels[rowIndex]} then ${colLabels[colIndex]}: ${format(value)}`}
                  onClick={() => select(rowIndex, colIndex)}
                  onMouseEnter={() => onSelect({ row: rowIndex, col: colIndex, value })}
                  onKeyDown={(event) => onKeyDown(event, rowIndex, colIndex)}
                  onFocus={() => setFocus({ row: rowIndex, col: colIndex })}
                  className={cx(
                    "relative flex aspect-square min-h-9 items-center justify-center rounded-[5px] text-[0.68rem] font-semibold tabular-nums transition-[transform,box-shadow] duration-100",
                    "hover:z-10 hover:scale-110 focus-visible:z-10",
                    isSelected && "z-10 scale-110 ring-2 ring-ink ring-offset-1 ring-offset-surface",
                    selected && !inCross && "opacity-80",
                  )}
                  style={{ background: color.fill, color: color.text }}
                >
                  {Math.abs(value) >= labelThreshold ? format(value) : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapLegend({ mode, max, format, lowLabel, highLabel }: { mode: "sequential" | "diverging"; max: number; format: (v: number) => string; lowLabel: string; highLabel: string }) {
  const { theme } = useTheme();
  const stops = Array.from({ length: 24 }, (_, i) => i / 23);
  const gradient = stops
    .map((t) => (mode === "sequential" ? sequentialColor(t * max, max, theme) : divergingColor((t * 2 - 1) * max, max, theme)).fill)
    .join(", ");
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span>{lowLabel}</span>
      <div className="h-2.5 w-40 rounded-full sm:w-56" style={{ background: `linear-gradient(90deg, ${gradient})` }} aria-hidden="true" />
      <span>{highLabel}</span>
      <span className="ml-1 tabular-nums text-subtle">
        ({mode === "sequential" ? `0 – ${format(max)}` : `−${format(max).replace(/^[+−-]/, "")} … +${format(max).replace(/^[+−-]/, "")}`})
      </span>
    </div>
  );
}
