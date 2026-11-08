import { describe, expect, test } from "bun:test";

import { formatValue, toDate, toInputDate } from "@/registry/kadal/ui/data-grid/data-grid-format";

describe("formatValue", () => {
  test("numbers, currency and percent follow the locale", () => {
    expect(formatValue(1234.5, { kind: "number" }, undefined, "en-US")).toBe("1,234.5");
    expect(formatValue(0.256, { kind: "percent" }, undefined, "en-US")).toBe("25.6%");
    const eur = formatValue(12, { kind: "currency", currency: "EUR" }, undefined, "de-DE");
    expect(eur).toContain("12,00");
    expect(eur).toContain("€");
    expect(formatValue(1234, { kind: "currency" }, undefined, "en-US")).toBe("$1,234.00");
  });

  test("dates respect dateStyle and parse strings", () => {
    // No zone suffix: local midday, so the calendar day is the same in every time zone.
    expect(formatValue("2026-01-05T12:00:00", { kind: "date" }, undefined, "en-US")).toBe(
      "Jan 5, 2026",
    );
    expect(
      formatValue("2026-01-05T12:00:00", { kind: "date", dateStyle: "long" }, undefined, "en-GB"),
    ).toBe("5 January 2026");
    expect(formatValue("not a date", { kind: "date" }, undefined, "en-US", "—")).toBe("—");
  });

  test("booleans use the words given", () => {
    expect(formatValue(true, { kind: "boolean" }, undefined, undefined)).toBe("Yes");
    expect(
      formatValue(false, { kind: "boolean" }, undefined, undefined, "—", { yes: "Oui", no: "Non" }),
    ).toBe("Non");
  });

  test("enum and tags map values to option labels", () => {
    const options = [
      { value: "a", label: "Active" },
      { value: "c", label: "Churned" },
    ];
    expect(formatValue("c", { kind: "enum", options }, undefined, undefined)).toBe("Churned");
    expect(formatValue("zzz", { kind: "enum", options }, undefined, undefined)).toBe("zzz");
    expect(formatValue(["a", "c"], { kind: "tags", options }, undefined, undefined)).toBe(
      "Active, Churned",
    );
    expect(formatValue([], { kind: "tags", options }, undefined, undefined, "—")).toBe("—");
  });

  test("blank values show the blank text, and a format function wins", () => {
    expect(formatValue(null, { kind: "number" }, undefined, undefined, "—")).toBe("—");
    expect(formatValue("", { kind: "text" }, undefined, undefined, "n/a")).toBe("n/a");
    expect(
      formatValue(7, { kind: "number", format: (v) => `#${String(v)}` }, undefined, undefined),
    ).toBe("#7");
  });
});

describe("dates", () => {
  test("toDate accepts Date, ISO strings and timestamps, and rejects junk", () => {
    expect(toDate(new Date(0))?.getTime()).toBe(0);
    expect(toDate("2026-02-03T00:00:00Z")?.toISOString()).toBe("2026-02-03T00:00:00.000Z");
    expect(toDate(86400000)?.toISOString()).toBe("1970-01-02T00:00:00.000Z");
    expect(toDate("tomorrow")).toBeNull();
    expect(toDate("")).toBeNull();
  });

  test("toInputDate writes what <input type=date|datetime-local> wants", () => {
    const d = new Date(2026, 0, 5, 9, 7);
    expect(toInputDate(d, false)).toBe("2026-01-05");
    expect(toInputDate(d, true)).toBe("2026-01-05T09:07");
    expect(toInputDate(null, true)).toBe("");
  });
});
