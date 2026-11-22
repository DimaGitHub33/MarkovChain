import type { ReactNode } from "react";
import type { ActionKind } from "../lib/types";
import { useCatalog } from "./CatalogProvider";
import { Icon } from "./Icon";
import { cx } from "./ui";

const KIND_STYLES: Record<ActionKind, string> = {
  regular: "bg-surface-2 text-ink border-line",
  failure: "bg-failure-soft text-failure border-failure/35",
  help: "bg-help-soft text-help border-help/35",
};

export const KIND_LABEL: Record<ActionKind, string> = {
  regular: "Regular action",
  failure: "Failure",
  help: "Help page",
};

interface ActionChipProps {
  action: string;
  number?: number;
  size?: "sm" | "md";
  children?: ReactNode;
  className?: string;
}

export function ActionChip({ action, number, size = "md", children, className }: ActionChipProps) {
  const { byId } = useCatalog();
  const info = byId.get(action);
  const kind = info?.kind ?? "regular";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "py-0.5 pr-2.5 pl-2 text-xs" : "py-1 pr-3 pl-2 text-sm",
        KIND_STYLES[kind],
        className,
      )}
      title={info?.description}
    >
      {number !== undefined && (
        <span className="tabular-nums text-[0.7rem] font-bold opacity-75" aria-hidden="true">
          {number}
        </span>
      )}
      <Icon name={action} size={size === "sm" ? 13 : 15} />
      <span>{info?.label ?? action}</span>
      {kind !== "regular" && <span className="sr-only">({KIND_LABEL[kind]})</span>}
      {children}
    </span>
  );
}

/** A read-only sequence of chips joined by arrows. */
export function ChipSequence({ actions, size = "sm" }: { actions: string[]; size?: "sm" | "md" }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Sequence of actions">
      {actions.map((action, index) => (
        <li key={index} className="flex items-center gap-1.5">
          {index > 0 && <Icon name="chevron-right" size={14} className="text-subtle" />}
          <ActionChip action={action} size={size} />
        </li>
      ))}
    </ol>
  );
}

export function KindLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle" aria-label="Chip colours">
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-line-strong bg-surface-3" />Regular action</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-failure" />Failure</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-help" />Help page</li>
    </ul>
  );
}
