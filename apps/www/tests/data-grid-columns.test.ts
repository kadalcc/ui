import { describe, expect, test } from "bun:test";

import {
  createDataGridColumns,
  kindDefaults,
  ROW_ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
  splitColumnOptions,
  UTILITY_KINDS,
} from "@/registry/kadal/ui/data-grid/data-grid-columns";

interface Person {
  id: string;
  name: string;
  team: string;
  mrr: number;
  address: { city: string };
}

const defOf = (column: unknown) => column as Record<string, unknown> & { meta: Record<string, unknown> };

describe("kindDefaults", () => {
  test("each kind brings its sort, filter and aggregation", () => {
    expect(kindDefaults("number")).toMatchObject({ sortFn: "basic", filterFn: "range", aggregationFn: "sum" });
    expect(kindDefaults("percent").aggregationFn).toBe("mean");
    expect(kindDefaults("date")).toMatchObject({ sortFn: "datetime", filterFn: "dateRange" });
    expect(kindDefaults("enum")).toMatchObject({ filterFn: "facet", meta: { filter: "facet" } });
    expect(kindDefaults("text").meta).toEqual({ kind: "text", filter: "text" });
  });

  test("utility kinds opt out of everything, including cell selection", () => {
    for (const kind of UTILITY_KINDS) {
      expect(kindDefaults(kind)).toMatchObject({
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        enableCellSelection: false,
        meta: { kind, export: false, stable: true },
      });
    }
  });
});

describe("splitColumnOptions", () => {
  test("separates TanStack options from the grid's meta", () => {
    const { def, meta } = splitColumnOptions("text", {
      header: "Name",
      size: 120,
      label: "Full name",
      align: "end",
      editable: true,
      meta: { wrap: true },
    });
    expect(def).toEqual({ header: "Name", size: 120 });
    expect(meta).toEqual({ kind: "text", wrap: true, label: "Full name", align: "end", editable: true });
  });
});

describe("createDataGridColumns", () => {
  const col = createDataGridColumns<Person>();

  test("a typed column merges the kind defaults with its options", () => {
    const def = defOf(col.currency("mrr", { header: "MRR", currency: "EUR" }));
    expect(def.accessorKey).toBe("mrr");
    expect(def.sortFn).toBe("basic");
    expect(def.filterFn).toBe("range");
    expect(def.meta).toMatchObject({ kind: "currency", currency: "EUR", align: "end", filter: "range" });
  });

  test("nested keys and accessor functions work", () => {
    expect(defOf(col.text("address.city")).accessorKey).toBe("address.city");
    const byFn = defOf(col.number((row) => row.mrr * 12, { id: "arr", header: "ARR" }));
    expect(byFn.id).toBe("arr");
    expect(typeof byFn.accessorFn).toBe("function");
  });

  test("`filter` picks the matching function unless filterFn is given", () => {
    expect(defOf(col.text("team", { filter: "facet" })).filterFn).toBe("facet");
    expect(defOf(col.text("team", { filter: "facet", filterFn: "text" })).filterFn).toBe("text");
    expect(defOf(col.text("name", { filter: false })).enableColumnFilter).toBe(false);
  });

  test("utility columns have fixed ids and sit outside selection and sorting", () => {
    const select = defOf(col.select());
    expect(select.id).toBe(SELECT_COLUMN_ID);
    expect(select.enableCellSelection).toBe(false);
    const actions = defOf(col.actions(() => null));
    expect(actions.id).toBe(ROW_ACTIONS_COLUMN_ID);
    expect(actions.header).toBe("");
    expect(actions.meta).toMatchObject({ kind: "actions", align: "end", export: false });
  });

  test("a group takes typed builder columns as they are", () => {
    const group = defOf(col.group("Money", [col.currency("mrr"), col.number("mrr", { id: "seats" })]));
    expect(group.id).toBe("Money");
    expect((group.columns as unknown[]).length).toBe(2);
  });

  test("tags columns expose each item as a facet value", () => {
    const tags = defOf(col.tags("team"));
    const getUniqueValues = tags.getUniqueValues as (row: Person, index: number) => unknown[];
    expect(getUniqueValues({ id: "1", name: "A", team: "x", mrr: 0, address: { city: "" } }, 0)).toEqual(["x"]);
  });
});
