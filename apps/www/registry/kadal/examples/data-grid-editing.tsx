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
  col.text("name", {
    header: "Name",
    editable: {
      placeholder: "Full name",
      validate: (v) => (v.trim() ? null : "A name is required"),
    },
  }),
  col.number("seats", {
    header: "Seats",
    // min/max/step configure the input; only `validate` can reject a value.
    editable: {
      min: 1,
      max: 500,
      step: 1,
      validate: (v) =>
        !Number.isFinite(v)
          ? "Seats are required"
          : v < 1 || v > 500
            ? "Between 1 and 500"
            : Number.isInteger(v)
              ? null
              : "Whole seats only",
    },
  }),
  col.enum("plan", {
    header: "Plan",
    options: PLAN_OPTIONS,
    editable: true,
    // The column's own handler runs first; throwing keeps the editor open with the message.
    onEdit: async ({ value }) => {
      await new Promise((r) => setTimeout(r, 300));
      if (value === "enterprise") throw new Error("Enterprise plans are set by sales");
    },
  }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.boolean("active", { header: "Active", editable: true }),
  col.text("notes", {
    header: "Notes",
    size: 240,
    editable: { type: "textarea", placeholder: "Add a note…" },
  }),
]);

/** Text, number, select, checkbox and textarea editors, with validation and an edit log. */
export default function DataGridEditing() {
  const [data, setData] = React.useState(() => makePeople(40, 21));
  const [log, setLog] = React.useState<string[]>([]);
  const grid = useDataGrid<Person>({
    name: "editing",
    data,
    columns,
    getRowId: (r) => r.id,
    pagination: { pageSize: 6 },
    onCellEdit: ({ rowId, columnId, value, previous, row }) => {
      setData((prev) => prev.map((p) => (p.id === rowId ? { ...p, [columnId]: value } : p)));
      setLog((prev) =>
        [`${row.name} · ${columnId}: ${String(previous)} → ${String(value)}`, ...prev].slice(0, 5),
      );
    },
  });
  return (
    <div className="flex flex-col gap-3">
      <DataGrid grid={grid} />
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <p className="font-medium">Edit log</p>
        {log.length ? (
          <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">
            Double-click a cell, or focus one and press Enter. Try 0 seats, or the Enterprise plan.
          </p>
        )}
      </div>
    </div>
  );
}
