"use client";

import * as React from "react";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kadal/ui/dropdown-menu";
import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import { makePeople, PLAN_OPTIONS, STATUS_OPTIONS, type Person } from "./data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.select(),
  col.text("name", { header: "Name", editable: true, size: 200 }),
  col.link("email", { header: "Email", size: 240, href: (v) => `mailto:${v}` }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, editable: true, size: 120 }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 120 }),
  col.text("team", { header: "Team", size: 120 }),
  col.text("role", { header: "Role", size: 120 }),
  col.currency("mrr", { header: "MRR", currency: "USD", editable: { min: 0 }, size: 120 }),
  col.number("seats", { header: "Seats", editable: { min: 1, step: 1 }, size: 90 }),
  col.percent("usage", { header: "Usage", size: 100 }),
  col.boolean("active", { header: "Active", editable: true, size: 90 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
  col.datetime("lastSeenAt", { header: "Last seen", size: 180 }),
  col.tags("tags", { header: "Tags", size: 200 }),
  col.text("country", { header: "Country", size: 130 }),
  col.text("notes", { header: "Notes", editable: { type: "textarea" }, size: 220, filter: "text" }),
  col.actions(({ row }) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Row actions" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(row.original.id)}>Copy ID</DropdownMenuItem>
        <DropdownMenuItem onClick={() => row.pin(row.getIsPinned() ? false : "top")}>
          {row.getIsPinned() ? "Unpin row" : "Pin row to top"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )),
]);

export default function DataGridDemo({ rows = 500 }: { rows?: number }) {
  const [data, setData] = React.useState(() => makePeople(rows));
  const grid = useDataGrid<Person>({
    key: "demo",
    data,
    columns,
    getRowId: (row) => row.id,
    persist: "kadal-ui-demo",
    rowPinning: true,
    onCellEdit: ({ rowId, columnId, value }) =>
      setData((prev) => prev.map((p) => (p.id === rowId ? { ...p, [columnId]: value } : p))),
  });
  // The dev page and the e2e tests reach the api through here.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __grid: unknown }).__grid = grid;
  }
  return (
    <DataGrid
      grid={grid}
      height={560}
      bulkActions={(selected) => (
        <>
          <Button variant="outline" size="sm" onClick={() => alert(`Emailing ${selected.length}`)}>
            Email
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setData((prev) => prev.filter((p) => !selected.includes(p)))}>
            Delete
          </Button>
        </>
      )}
    />
  );
}
