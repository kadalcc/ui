import { describe, expect, test } from "bun:test";

import {
  dataGridFeatures,
  filterFn_boolean,
  filterFn_byValue,
  filterFn_dateRange,
  filterFn_facet,
  filterFn_fuzzy,
  filterFn_range,
  filterFn_textOp,
  rankMatch,
} from "@/registry/kadal/ui/data-grid/data-grid-features";

/** The only part of a row a filter function reads. */
const row = (value: unknown) => ({ getValue: () => value }) as never;
const passes = (
  fn: { (row: never, id: string, value: unknown): boolean },
  value: unknown,
  filter: unknown,
) => fn(row(value), "c", filter);

describe("rankMatch", () => {
  test("ranks from exact to subsequence", () => {
    expect(rankMatch("design", "design")).toBe(6);
    expect(rankMatch("design system", "des")).toBe(5);
    expect(rankMatch("design system", "sys")).toBe(4);
    expect(rankMatch("redesign", "sign")).toBe(3);
    expect(rankMatch("design system", "ds")).toBe(2);
    expect(rankMatch("design", "dsg")).toBe(1);
    expect(rankMatch("design", "xyz")).toBe(0);
    expect(rankMatch("anything", "")).toBe(1);
  });
});

describe("the named filter functions", () => {
  test("fuzzy matches subsequences and ignores blanks", () => {
    expect(passes(filterFn_fuzzy, "Priya Sharma", "psh")).toBe(true);
    expect(passes(filterFn_fuzzy, "Priya Sharma", "zz")).toBe(false);
    expect(filterFn_fuzzy.autoRemove?.("")).toBe(true);
  });

  test("facet compares as strings and reaches into arrays", () => {
    expect(passes(filterFn_facet, "a", ["a", "b"])).toBe(true);
    expect(passes(filterFn_facet, 1, ["1"])).toBe(true);
    expect(passes(filterFn_facet, ["x", "y"], ["y"])).toBe(true);
    expect(passes(filterFn_facet, "c", ["a", "b"])).toBe(false);
    expect(filterFn_facet.autoRemove?.([])).toBe(true);
  });

  test("text ops", () => {
    expect(passes(filterFn_textOp, "Hello World", { op: "contains", value: "world" })).toBe(true);
    expect(passes(filterFn_textOp, "Hello World", { op: "startsWith", value: "hello" })).toBe(true);
    expect(passes(filterFn_textOp, "Hello World", { op: "endsWith", value: "world" })).toBe(true);
    expect(passes(filterFn_textOp, "Hello World", { op: "equals", value: "hello world" })).toBe(
      true,
    );
    expect(passes(filterFn_textOp, "Hello World", { op: "notContains", value: "x" })).toBe(true);
    expect(passes(filterFn_textOp, "", { op: "isEmpty", value: "" })).toBe(true);
    expect(passes(filterFn_textOp, null, { op: "isNotEmpty", value: "" })).toBe(false);
    expect(passes(filterFn_textOp, "abc", "b")).toBe(true);
    // An operator with no value is no filter; the "empty" operators stand on their own.
    expect(filterFn_textOp.autoRemove?.({ op: "startsWith", value: "" })).toBe(true);
    expect(filterFn_textOp.autoRemove?.({ op: "isEmpty", value: "" })).toBe(false);
  });

  test("range is inclusive and open-ended", () => {
    expect(passes(filterFn_range, 10, { min: 10, max: 20 })).toBe(true);
    expect(passes(filterFn_range, 21, { min: 10, max: 20 })).toBe(false);
    expect(passes(filterFn_range, 5, { max: 20 })).toBe(true);
    expect(passes(filterFn_range, "7", { min: 5 })).toBe(true);
    expect(passes(filterFn_range, null, { min: 0 })).toBe(false);
    expect(filterFn_range.autoRemove?.({ min: null, max: null })).toBe(true);
  });

  test("date range treats a bare `to` date as the whole day", () => {
    const filter = { from: "2026-01-01", to: "2026-01-31" };
    expect(passes(filterFn_dateRange, "2026-01-31T23:00:00Z", filter)).toBe(true);
    expect(passes(filterFn_dateRange, "2026-02-01T00:00:00Z", filter)).toBe(false);
    expect(passes(filterFn_dateRange, new Date("2025-12-31T00:00:00Z"), filter)).toBe(false);
    expect(passes(filterFn_dateRange, "nope", filter)).toBe(false);
  });

  test("boolean", () => {
    expect(passes(filterFn_boolean, true, true)).toBe(true);
    expect(passes(filterFn_boolean, 0, false)).toBe(true);
    expect(filterFn_boolean.autoRemove?.(undefined)).toBe(true);
  });
});

describe("filterFn_byValue", () => {
  test("dispatches on the shape of the filter value", () => {
    expect(passes(filterFn_byValue, "a", ["a"])).toBe(true);
    expect(passes(filterFn_byValue, "Ada", { op: "startsWith", value: "ad" })).toBe(true);
    expect(passes(filterFn_byValue, 15, { min: 10, max: 20 })).toBe(true);
    expect(passes(filterFn_byValue, "2026-03-03", { from: "2026-03-01" })).toBe(true);
    expect(passes(filterFn_byValue, false, false)).toBe(true);
    expect(passes(filterFn_byValue, "Ada Lovelace", "love")).toBe(true);
  });

  test("auto-removes the empty shape of each kind", () => {
    expect(filterFn_byValue.autoRemove?.([])).toBe(true);
    expect(filterFn_byValue.autoRemove?.({ op: "contains", value: "" })).toBe(true);
    expect(filterFn_byValue.autoRemove?.({ min: null, max: null })).toBe(true);
    expect(filterFn_byValue.autoRemove?.({ from: null, to: null })).toBe(true);
    expect(filterFn_byValue.autoRemove?.("")).toBe(true);
    expect(filterFn_byValue.autoRemove?.(true)).toBe(false);
    expect(filterFn_byValue.autoRemove?.(["a"])).toBe(false);
  });
});

describe("dataGridFeatures", () => {
  test("registers every name a column may use", () => {
    expect(Object.keys(dataGridFeatures.filterFns ?? {})).toEqual(
      expect.arrayContaining([
        "fuzzy",
        "facet",
        "text",
        "range",
        "dateRange",
        "boolean",
        "byValue",
        "includesString",
      ]),
    );
    expect(Object.keys(dataGridFeatures.sortFns ?? {})).toEqual(
      expect.arrayContaining(["alphanumeric", "basic", "datetime"]),
    );
    expect(Object.keys(dataGridFeatures.aggregationFns ?? {})).toEqual(
      expect.arrayContaining(["sum", "mean", "extent", "count", "uniqueCount"]),
    );
  });
});
