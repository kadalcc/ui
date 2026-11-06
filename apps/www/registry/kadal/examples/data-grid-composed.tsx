"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  DataGridBulkActions,
  DataGridDensityMenu,
  DataGridExportMenu,
  DataGridFilterChips,
  DataGridPagination,
  DataGridRoot,
  DataGridSearch,
  DataGridTable,
  DataGridViewOptions,
  createDataGridColumns,
  useDataGrid,
} from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();
const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", {
    header: "MRR",
    currency: "USD",
    footer: ({ column }) => `Σ ${column.getAggregationValue<number>().toLocaleString()}`,
  }),
]);
const data = makePeople(60, 5);

/** Your own layout from the parts: a title row, the search beside your buttons, the pager on top. */
export default function DataGridComposed() {
  const grid = useDataGrid<Person>({ key: "composed", data, columns, getRowId: (r) => r.id });
  return (
    <DataGridRoot grid={grid}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Customers</h2>
          <DataGridSearch className="max-w-56" />
          <DataGridFilterChips />
        </div>
        <div className="flex items-center gap-2">
          <DataGridViewOptions />
          <DataGridDensityMenu />
          <DataGridExportMenu filename="customers" />
          <Button size="sm">
            <PlusIcon /> New customer
          </Button>
        </div>
      </div>
      <DataGridBulkActions>
        {(rows) => (
          <Button variant="outline" size="sm" onClick={() => alert(`${rows.length} rows`)}>
            Export selected
          </Button>
        )}
      </DataGridBulkActions>
      <DataGridPagination />
      <DataGridTable height={420} striped />
    </DataGridRoot>
  );
}
