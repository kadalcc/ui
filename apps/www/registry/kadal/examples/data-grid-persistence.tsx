"use client";

import {
  DataGrid,
  createDataGridColumns,
  sessionStorageStorage,
  useDataGrid,
} from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.text("team", { header: "Team" }),
  col.text("role", { header: "Role" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  col.number("seats", { header: "Seats" }),
  col.date("joinedAt", { header: "Joined" }),
]);

const data = makePeople(60, 39);

/** The view (columns, sort, sizes, pinning, order, grouping, density, page size) survives a reload. */
export default function DataGridPersistence() {
  const grid = useDataGrid<Person>({
    name: "persistence",
    data,
    columns,
    getRowId: (r) => r.id,
    pagination: { pageSize: 8 },
    // sessionStorage: the view lasts this tab and no longer. Leave `storage` out for localStorage.
    persist: { key: "docs-persistence", storage: sessionStorageStorage },
  });
  return (
    <div className="flex flex-col gap-3">
      <DataGrid grid={grid} />
      <p className="text-sm text-muted-foreground">
        Hide a column, resize one, sort, change the density, then reload the page: the view comes
        back. Save it under a name from the <strong>Views</strong> menu ({grid.views.saved.length}{" "}
        saved). Stored under{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          kadal:data-grid:v1:anon:docs-persistence
        </code>
        .
      </p>
    </div>
  );
}
