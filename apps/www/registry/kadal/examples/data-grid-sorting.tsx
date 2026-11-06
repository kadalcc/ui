"use client";

import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name", size: 180 }),
  // Shortest to longest rather than A to Z: a sort function gets the two rows and the column id.
  col.text("email", {
    header: "Email",
    size: 240,
    sortFn: (a, b, id) => a.getValue<string>(id).length - b.getValue<string>(id).length,
  }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  // Numbers sort descending on the first click; this one starts ascending.
  col.number("seats", { header: "Seats", sortDescFirst: false, size: 90 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
  // Free text has no useful order.
  col.text("notes", { header: "Notes", enableSorting: false, size: 220 }),
]);

const data = makePeople(80, 12);

/** Click a header to sort, shift-click another to add a second key. Starts sorted by MRR, highest first. */
export default function DataGridSorting() {
  const grid = useDataGrid<Person>({
    name: "sorting",
    data,
    columns,
    getRowId: (row) => row.id,
    selection: false,
    initialState: { sorting: [{ id: "mrr", desc: true }] },
  });
  return <DataGrid grid={grid} />;
}
