import { describe, expect, it } from "vitest";
import { formatPercent, formatRatio, pluralize } from "./format";
import { divergingColor, sequentialColor } from "./theme";

describe("format", () => {
  it("formats ratios for people", () => {
    expect(formatRatio(1.46)).toBe("1.5×");
    expect(formatRatio(22.51)).toBe("23×");
    expect(formatRatio(3200.4)).toBe("3,200×");
    expect(formatRatio(Infinity)).toBe("over 1,000,000×");
  });

  it("formats percents and missing values", () => {
    expect(formatPercent(0.6105)).toBe("61%");
    expect(formatPercent(0.1291, 1)).toBe("12.9%");
    expect(formatPercent(null)).toBe("—");
  });

  it("pluralizes", () => {
    expect(pluralize(1, "action")).toBe("1 action");
    expect(pluralize(1200, "user")).toBe("1,200 users");
  });
});

describe("colour scales", () => {
  it("uses readable text on light and dark cells", () => {
    expect(sequentialColor(0, 1, "light").text).toBe("#0f172a");
    expect(sequentialColor(1, 1, "light").text).toBe("#f8fafc");
    expect(sequentialColor(0, 1, "dark").text).toBe("#f8fafc");
  });

  it("maps zero difference to the neutral middle colour", () => {
    expect(divergingColor(0, 0.3, "light").fill).toBe("rgb(248 250 252)");
    expect(divergingColor(0.3, 0.3, "light").fill).toBe("rgb(194 65 12)");
    expect(divergingColor(-0.3, 0.3, "light").fill).toBe("rgb(29 78 216)");
  });
});
