import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/** Renders a TeX formula. Display formulas scroll horizontally on narrow screens. */
export function Math({ tex, display = false, label }: { tex: string; display?: boolean; label?: string }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "htmlAndMathml" }), [tex, display]);
  if (display) {
    return (
      <div
        className="overflow-x-auto rounded-xl bg-surface-2 px-5 py-4 text-ink"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
