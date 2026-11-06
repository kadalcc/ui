"use client";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name", size: 180 }),
  col.text("email", { header: "Email", size: 240 }),
  col.text("team", { header: "Team", size: 120 }),
  col.text("role", { header: "Role", size: 120 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.text("country", { header: "Country", size: 130 }),
  // Free text that should not make a row match: keep it out of the search.
  col.text("notes", { header: "Notes", enableGlobalFilter: false, size: 220 }),
]);

const data = makePeople(150, 14);

/** Starts with "design" typed: the Design team and every Designer match. Try "dsg" (a subsequence) or a surname. */
export default function DataGridSearchDemo() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      selection={false}
      initialState={{ globalFilter: "design" }}
      toolbar={{ grouping: false, density: false, export: false, fullscreen: false }}
    />
  );
}
