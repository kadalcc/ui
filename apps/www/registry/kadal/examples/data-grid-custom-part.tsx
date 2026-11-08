"use client";

import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  DataGridPagination,
  DataGridRoot,
  DataGridTable,
  DataGridToolbar,
  createDataGridColumns,
  useDataGrid,
  useDataGridContext,
} from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

/** A toolbar part of your own. It reads the grid from context, so it works inside any grid. */
function ResetEverything() {
  const { table } = useDataGridContext<Person>();
  const { state } = table;
  const dirty =
    state.sorting.length > 0 ||
    state.columnFilters.length > 0 ||
    Boolean(state.globalFilter) ||
    state.grouping.length > 0 ||
    Object.keys(state.rowSelection).length > 0 ||
    Object.keys(state.columnVisibility).length > 0 ||
    state.columnOrder.length > 0 ||
    state.columnPinning.start.length + state.columnPinning.end.length > 0 ||
    Object.keys(state.columnSizing).length > 0;
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      disabled={!dirty}
      onClick={() => {
        table.resetSorting(true);
        table.resetColumnFilters(true);
        table.resetGlobalFilter(true);
        table.resetGrouping(true);
        table.resetRowSelection(true);
        table.resetColumnVisibility(true);
        table.resetColumnOrder(true);
        table.resetColumnPinning(true);
        table.resetColumnSizing(true);
        table.setPageIndex(0);
      }}
    >
      <RotateCcwIcon /> Reset everything
    </Button>
  );
}

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const data = makePeople(60, 43);

/** The built-in toolbar with one extra part; sort, filter or pin something and the button wakes up. */
export default function DataGridCustomPart() {
  const grid = useDataGrid<Person>({ name: "custom-part", data, columns, getRowId: (r) => r.id });
  return (
    <DataGridRoot grid={grid}>
      <DataGridToolbar views={false} fullscreen={false}>
        <ResetEverything />
      </DataGridToolbar>
      <DataGridTable />
      <DataGridPagination />
    </DataGridRoot>
  );
}
