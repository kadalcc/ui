"use client";

import * as React from "react";

import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name", editable: true }),
  col.text("team", { header: "Team" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, editable: true }),
  col.number("seats", { header: "Seats", editable: { min: 1, step: 1 } }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  col.date("joinedAt", { header: "Joined" }),
]);

const KEYS: Array<[keys: string, what: string]> = [
  ["↑ ↓ ← →", "move"],
  ["Shift + ↑ ↓ ← →", "extend the range"],
  ["Home / End", "first / last column"],
  ["PageUp / PageDown", "a screen of rows"],
  ["Enter or F2", "edit"],
  ["Space", "select the row"],
  ["⌘A", "select every cell"],
  ["⌘C", "copy"],
  ["Esc", "collapse the range"],
];

/** A plain grid to try the keyboard model on: click a cell, then use the keys below. */
export default function DataGridKeyboard() {
  const [data, setData] = React.useState(() => makePeople(50, 33));
  const grid = useDataGrid<Person>({
    name: "keyboard",
    data,
    columns,
    getRowId: (r) => r.id,
    pagination: { pageSize: 8 },
    onCellEdit: ({ rowId, columnId, value }) =>
      setData((prev) => prev.map((p) => (p.id === rowId ? { ...p, [columnId]: value } : p))),
  });
  return (
    <div className="flex flex-col gap-3">
      <DataGrid grid={grid} />
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
        <span>Click a cell, then try:</span>
        {KEYS.map(([keys, what]) => (
          <span key={keys} className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {keys}
            </kbd>{" "}
            {what}
          </span>
        ))}
      </p>
    </div>
  );
}
