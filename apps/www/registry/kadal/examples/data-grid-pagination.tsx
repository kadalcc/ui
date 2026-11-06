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
  col.rowNumber(),
  col.text("name", { header: "Name", size: 180 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 110 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
]);

const data = makePeople(300, 15);

/** 300 rows, 25 to a page, opened on page 3. The pager offers your sizes, and a go-to box past five pages. */
export default function DataGridPaginationDemo() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      selection={false}
      height={420}
      pagination={{ pageSize: 25, pageSizeOptions: [25, 50, 100, 300] }}
      initialState={{ pagination: { pageIndex: 2, pageSize: 25 } }}
    />
  );
}
