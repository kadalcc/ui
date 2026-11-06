"use client";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.expander(),
  col.select(),
  col.text("name", { header: "Name" }),
  col.text("role", { header: "Role" }),
  col.text("team", { header: "Team" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const data = makePeople(40, 3, { tree: true });

/** Nested rows from `subRows`: the expander column, indented children, and selection that follows the tree. */
export default function DataGridTree() {
  return (
    <DataGrid
      key="tree"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      initialState={{ expanded: { p00000: true } }}
    />
  );
}
