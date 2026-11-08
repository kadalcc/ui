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
  col.text("name", { header: "Name", size: 136 }),
  col.link("email", { header: "Email", href: (v) => `mailto:${v}`, size: 186 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 100 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 100 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 96 }),
  col.date("joinedAt", { header: "Joined", size: 118 }),
]);

const data = makePeople(120, 7);

/** The smallest useful grid: columns, data, and nothing else. */
export default function DataGridBasic() {
  return <DataGrid name="basic" data={data} columns={columns} getRowId={(row) => row.id} />;
}
