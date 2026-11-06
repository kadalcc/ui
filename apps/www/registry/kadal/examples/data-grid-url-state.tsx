"use client";

import { NuqsAdapter } from "nuqs/adapters/react";

import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";
import { useDataGridUrlState } from "@/registry/kadal/hooks/use-data-grid-url-state";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();
const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);
const data = makePeople(300, 9);

function UrlStateGrid() {
  // Filters, the search and the page live in the URL (?people.filters=…&people.q=…&people.page=2).
  const urlState = useDataGridUrlState({ key: "people" });
  const grid = useDataGrid<Person>({
    key: "url-state",
    data,
    columns,
    getRowId: (r) => r.id,
    state: urlState,
  });
  return <DataGrid grid={grid} />;
}

/** Share a filtered view by its URL. The adapter comes from nuqs; pick the one for your router. */
export default function DataGridUrlState() {
  return (
    <NuqsAdapter>
      <UrlStateGrid />
    </NuqsAdapter>
  );
}
