"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name" }),
  col.link("email", { header: "Email", size: 230, href: (v) => `mailto:${v}` }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  col.percent("usage", { header: "Usage" }),
  // A function supplies the exported value: ISO dates instead of the formatted display.
  col.date("joinedAt", { header: "Joined", export: (v) => v.toISOString().slice(0, 10) }),
  col.tags("tags", { header: "Tags" }),
  // Kept on screen, left out of every export.
  col.text("notes", { header: "Notes", export: false }),
]);

const data = makePeople(80, 35);

/** The Export menu plus a custom button that exports raw values through the api. */
export default function DataGridExport() {
  const grid = useDataGrid<Person>({ key: "export", data, columns, getRowId: (r) => r.id });
  const selected = Object.keys(grid.table.state.rowSelection).length;
  const rows = grid.exportTable({ selectedOnly: selected > 0 }).rows.length;
  return (
    <DataGrid
      grid={grid}
      toolbarActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            grid.exportCsv("customers", { selectedOnly: selected > 0, formatted: false })
          }
        >
          <DownloadIcon /> Raw CSV · {rows} {rows === 1 ? "row" : "rows"}
        </Button>
      }
    />
  );
}
