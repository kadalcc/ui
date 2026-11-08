"use client";

import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name", size: 180 }),
  col.text("email", { header: "Email", size: 240 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 120 }),
  col.text("team", { header: "Team", size: 140 }),
  col.text("role", { header: "Role", size: 140 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  col.number("seats", { header: "Seats", size: 90 }),
  col.percent("usage", { header: "Usage", size: 100 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
  // Its menu has no "Pin" items.
  col.text("notes", { header: "Notes", size: 220, enablePinning: false }),
  col.text("country", { header: "Country", size: 130 }),
  col.actions(({ row }) => (
    <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${row.original.name}`}>
      <MoreHorizontalIcon />
    </Button>
  )),
]);

const data = makePeople(60, 13);

/** Checkbox and Name pinned to the start, the actions menu to the end; scroll sideways and they stay. */
export default function DataGridPinning() {
  return (
    <DataGrid
      name="pinning"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{ columnPinning: { start: ["select", "name"], end: ["actions"] } }}
    />
  );
}
