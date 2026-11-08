"use client";

import * as React from "react";
import { ClipboardCopyIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  DataGrid,
  copyText,
  createDataGridColumns,
  selectedCellsToTsv,
  useDataGrid,
} from "@/registry/kadal/ui/data-grid";

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
  col.text("team", { header: "Team" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.number("seats", { header: "Seats" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const data = makePeople(60, 27);

/** Spreadsheet-style ranges: drag, Shift-click, ⌘-click, then copy as TSV. */
export default function DataGridCellSelection() {
  const grid = useDataGrid<Person>({
    name: "cell-selection",
    data,
    columns,
    getRowId: (r) => r.id,
    pagination: { pageSize: 8 },
  });
  const [copied, setCopied] = React.useState(0);
  // `table.state` is reactive, so this component re-renders as the selection changes.
  const count = grid.table.state.cellSelection.length ? grid.table.getSelectedCellCount() : 0;

  const copy = async () => {
    const { text, count: n } = selectedCellsToTsv(grid);
    if (n && (await copyText(text))) setCopied(n);
  };

  return (
    <DataGrid
      grid={grid}
      toolbarActions={
        <>
          <span className="text-sm text-muted-foreground tabular-nums">
            {count
              ? `${count} ${count === 1 ? "cell" : "cells"} selected`
              : copied
                ? `Copied ${copied}`
                : "Drag across cells"}
          </span>
          <Button variant="outline" size="sm" disabled={!count} onClick={copy}>
            <ClipboardCopyIcon /> Copy
          </Button>
        </>
      }
    />
  );
}
