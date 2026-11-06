"use client";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  // Starts at 200 px and can be dragged between 120 and 400.
  col.text("name", { header: "Name", size: 200, minSize: 120, maxSize: 400 }),
  col.text("email", { header: "Email", size: 260 }),
  // No handle, no "Fit to content": this column keeps its width.
  col.enum("status", {
    header: "Status",
    options: STATUS_OPTIONS,
    size: 120,
    enableResizing: false,
  }),
  col.text("team", { header: "Team", size: 140 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  // Too narrow on purpose: double-click its edge to fit.
  col.text("notes", { header: "Notes", size: 120 }),
]);

const data = makePeople(50, 19);

/** Drag a header's trailing edge to resize; double-click the edge to fit the column to its content. */
export default function DataGridResizing() {
  return <DataGrid name="resizing" data={data} columns={columns} getRowId={(row) => row.id} />;
}
