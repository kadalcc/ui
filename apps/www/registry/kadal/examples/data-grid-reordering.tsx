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
  col.select(),
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  // No drag handle on this one; it still shifts when its neighbours are moved past it.
  col.date("joinedAt", { header: "Joined", draggable: false }),
]);

const data = makePeople(50, 17);

/** Drag a header sideways, or use "Move left" / "Move right" in its menu. MRR starts in second place. */
export default function DataGridReordering() {
  return (
    <DataGrid
      key="reordering"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{
        columnOrder: ["select", "name", "mrr", "status", "plan", "team", "joinedAt"],
      }}
    />
  );
}
