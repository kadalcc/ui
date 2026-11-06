import { describe, expect, test } from "bun:test";

import { arrayMove, humanize, isCommandKey, isPlainObject } from "@/registry/kadal/ui/data-grid/data-grid-utils";

describe("arrayMove", () => {
  test("moves an item and leaves the input alone", () => {
    const items = ["a", "b", "c", "d"];
    expect(arrayMove(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(arrayMove(items, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(items).toEqual(["a", "b", "c", "d"]);
  });

  test("out-of-range or same positions return a copy", () => {
    const items = [1, 2, 3];
    expect(arrayMove(items, 1, 1)).toEqual(items);
    expect(arrayMove(items, -1, 1)).toEqual(items);
    expect(arrayMove(items, 0, 9)).toEqual(items);
    expect(arrayMove(items, 0, 1)).not.toBe(items);
  });
});

describe("humanize", () => {
  test("turns ids into titles", () => {
    expect(humanize("createdAt")).toBe("Created at");
    expect(humanize("mrr_total")).toBe("Mrr total");
    expect(humanize("billing.address")).toBe("Billing address");
    expect(humanize("ID")).toBe("ID");
    expect(humanize("")).toBe("");
  });
});

describe("small predicates", () => {
  test("isCommandKey is ⌘ or Ctrl", () => {
    expect(isCommandKey({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isCommandKey({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(isCommandKey({ metaKey: false, ctrlKey: false })).toBe(false);
  });

  test("isPlainObject excludes arrays and null", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
  });
});
