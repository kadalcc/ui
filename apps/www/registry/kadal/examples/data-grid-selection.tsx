"use client";

import * as React from "react";
import { PauseIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name", size: 180 }),
  col.text("team", { header: "Team", size: 120 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
]);

/** Click a checkbox, shift-click for a range, tick the header for the page. Churned rows can't be selected. */
export default function DataGridSelection() {
  const [data, setData] = React.useState(() => makePeople(60, 16));
  const grid = useDataGrid<Person>({
    name: "selection",
    data,
    columns,
    getRowId: (row) => row.id,
    selection: { enable: (row) => row.status !== "churned" },
  });

  // Selection is keyed by row id, so clear it once the rows it points at have changed.
  const pause = (rows: Person[]) => {
    const ids = new Set(rows.map((r) => r.id));
    setData((prev) =>
      prev.map((p) => (ids.has(p.id) ? { ...p, status: "paused", active: false } : p)),
    );
    grid.table.resetRowSelection(true);
  };
  const remove = (rows: Person[]) => {
    const ids = new Set(rows.map((r) => r.id));
    setData((prev) => prev.filter((p) => !ids.has(p.id)));
    grid.table.resetRowSelection(true);
  };

  return (
    <DataGrid
      grid={grid}
      bulkActions={(rows) => (
        <>
          <Button variant="outline" size="sm" onClick={() => pause(rows)}>
            <PauseIcon /> Pause {rows.length}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => remove(rows)}>
            <Trash2Icon /> Delete
          </Button>
        </>
      )}
    />
  );
}
