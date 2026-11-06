"use client";

import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns = col.columns([
  // Grouping by a name makes no sense, so keep it out of the "Group" menu.
  col.text("name", { header: "Name", groupable: false }),
  col.text("team", { header: "Team" }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  // Your own render for the aggregate: the default would be the unique count on its own.
  col.enum("status", {
    header: "Status",
    options: STATUS_OPTIONS,
    aggregatedCell: ({ getValue }) => (
      <span className="text-muted-foreground">{String(getValue())} distinct</span>
    ),
  }),
  // A currency column sums by default. The footer is the grand total over every filtered row.
  col.currency("mrr", {
    header: "MRR",
    currency: "USD",
    footer: ({ column }) => usd.format(column.getAggregationValue<number>() ?? 0),
  }),
  // Any registered aggregation by name; the group row and the footer both use it.
  col.number("seats", {
    header: "Seats",
    aggregationFn: "max",
    footer: ({ column }) => `max ${column.getAggregationValue<number>() ?? 0}`,
  }),
  col.percent("usage", { header: "Usage" }),
  col.date("joinedAt", { header: "Joined" }),
]);

const data = makePeople(80, 29);

/** Grouped by team to start, one group open. Group rows show the count and each column's aggregate. */
export default function DataGridGrouping() {
  return (
    <DataGrid
      key="grouping"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{ grouping: ["team"], expanded: { "team:Platform": true } }}
    />
  );
}
