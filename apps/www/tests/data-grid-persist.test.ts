import { describe, expect, test } from "bun:test";

import {
  defaultView,
  memoryStorage,
  sanitizeState,
  sanitizeView,
  storageKeyFor,
} from "@/registry/kadal/ui/data-grid/data-grid-persist";

const fallback = defaultView(25, "compact");

describe("sanitizeView", () => {
  test("junk falls back to the defaults", () => {
    expect(sanitizeView(null, fallback)).toBe(fallback);
    expect(sanitizeView("nope", fallback)).toBe(fallback);
    expect(sanitizeView([], fallback)).toBe(fallback);
  });

  test("keeps well-typed fields and drops the rest", () => {
    const view = sanitizeView(
      {
        sorting: [{ id: "a", desc: 1 }, { id: 3 }, "x"],
        columnVisibility: { a: false, b: "no" },
        columnPinning: { start: ["a", 1], end: "b" },
        columnOrder: ["b", "a", 2],
        columnSizing: { a: 120, b: "wide", c: Number.NaN },
        grouping: ["team"],
        pageSize: -1,
        density: "huge",
      },
      fallback,
    );
    expect(view.sorting).toEqual([{ id: "a", desc: true }]);
    expect(view.columnVisibility).toEqual({ a: false });
    expect(view.columnPinning).toEqual({ start: ["a"], end: [] });
    expect(view.columnOrder).toEqual(["b", "a"]);
    expect(view.columnSizing).toEqual({ a: 120 });
    expect(view.grouping).toEqual(["team"]);
    expect(view.pageSize).toBe(25);
    expect(view.density).toBe("compact");
  });
});

describe("sanitizeState", () => {
  test("accepts schema version 1 only", () => {
    expect(sanitizeState({ v: 2, current: {} }, fallback)).toBeNull();
    expect(sanitizeState("junk", fallback)).toBeNull();
    const state = sanitizeState(
      {
        v: 1,
        current: { pageSize: 50 },
        activeViewId: "v1",
        views: [{ id: "v1", name: "Mine", view: { density: "spacious" }, savedAt: "2026-01-01T00:00:00.000Z" }, { bad: true }],
      },
      fallback,
    );
    expect(state?.current.pageSize).toBe(50);
    expect(state?.current.density).toBe("compact");
    expect(state?.activeViewId).toBe("v1");
    expect(state?.views).toHaveLength(1);
    expect(state?.views[0]?.view.density).toBe("spacious");
  });
});

describe("storage", () => {
  test("keys are namespaced by version, scope and grid", () => {
    expect(storageKeyFor("orders")).toMatch(/^kadal:data-grid:v1:.+:orders$/);
    expect(storageKeyFor("orders", "user-7")).toBe("kadal:data-grid:v1:user-7:orders");
    expect(storageKeyFor("orders")).not.toBe(storageKeyFor("orders", "user-7"));
  });

  test("memoryStorage round-trips and forgets", () => {
    const storage = memoryStorage();
    const state = { v: 1 as const, current: fallback, activeViewId: null, views: [] };
    expect(storage.get("k")).toBeNull();
    storage.set("k", state);
    expect(storage.get("k")).toEqual(state);
    storage.remove("k");
    expect(storage.get("k")).toBeNull();
  });
});
