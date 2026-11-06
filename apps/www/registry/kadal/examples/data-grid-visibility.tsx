"use client";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  // Always shown: no "Hide column" in its menu and no entry in the View list.
  col.text("name", { header: "Name", enableHiding: false, size: 180 }),
  col.text("email", { header: "Email", size: 220 }),
  col.text("team", { header: "Team", size: 120 }),
  col.text("role", { header: "Role", size: 120 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 110 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  col.number("seats", { header: "Seats", size: 90 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
  col.text("country", { header: "Country", size: 130 }),
  col.text("notes", { header: "Notes", size: 220 }),
]);

const data = makePeople(60, 18);

/** Three columns start hidden. Open View to search and tick them back on, or hide more from a header menu. */
export default function DataGridVisibility() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      selection={false}
      initialState={{ columnVisibility: { email: false, country: false, notes: false } }}
      toolbar={{ grouping: false, density: false, export: false, fullscreen: false }}
    />
  );
}
