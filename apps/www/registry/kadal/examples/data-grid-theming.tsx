"use client";

import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name", size: 150 }),
  col.text("team", { header: "Team", size: 110 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 100 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 110 }),
  // Per-column classes for the header cell and the body cells.
  col.currency("mrr", {
    header: "MRR",
    currency: "USD",
    size: 110,
    headerClassName: "text-indigo-700 dark:text-indigo-300",
    cellClassName: (v) =>
      v > 500 ? "font-semibold text-indigo-700 dark:text-indigo-300" : undefined,
  }),
  col.date("joinedAt", { header: "Joined", size: 120 }),
]);

const data = makePeople(60, 53);

/** Striped, compact, a brand-coloured header row and a tinted selected row: all Tailwind classes. */
export default function DataGridTheming() {
  const grid = useDataGrid<Person>({
    name: "theming",
    data,
    columns,
    getRowId: (r) => r.id,
    defaultDensity: "compact",
    pagination: { pageSize: 10 },
  });
  return (
    <DataGrid
      grid={grid}
      striped
      tableClassName="rounded-xl border-indigo-200 dark:border-indigo-900 [&_thead_th]:bg-indigo-50 [&_thead_th]:text-indigo-950 dark:[&_thead_th]:bg-indigo-950/60 dark:[&_thead_th]:text-indigo-50"
      getRowClassName={(row) =>
        row.getIsSelected()
          ? "bg-indigo-500/10 hover:bg-indigo-500/15"
          : row.original.status === "churned"
            ? "text-muted-foreground"
            : undefined
      }
    />
  );
}
