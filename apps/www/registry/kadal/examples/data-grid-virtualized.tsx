"use client";

import * as React from "react";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.rowNumber(),
  col.text("name", { header: "Name" }),
  col.text("email", { header: "Email", size: 240 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  col.number("seats", { header: "Seats" }),
  col.percent("usage", { header: "Usage" }),
  col.date("joinedAt", { header: "Joined" }),
  col.text("country", { header: "Country" }),
]);

/** 50,000 rows, no pager: only the rows in view are in the DOM. */
export default function DataGridVirtualized({ rows = 50_000 }: { rows?: number }) {
  const data = React.useMemo(() => makePeople(rows, 11), [rows]);
  return (
    <DataGrid
      key="virtualized"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      pagination={false}
      virtualize
      height={520}
    />
  );
}
