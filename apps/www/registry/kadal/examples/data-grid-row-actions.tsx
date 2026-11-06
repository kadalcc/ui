"use client";

import * as React from "react";
import { CopyIcon, MoreHorizontalIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kadal/ui/dropdown-menu";
import { DataGrid, createDataGridColumns, useDataGrid } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

/** A menu per row, a click handler for the rest of the row, and a tint for churned customers. */
export default function DataGridRowActions() {
  const [data, setData] = React.useState(() => makePeople(40, 17));
  const [last, setLast] = React.useState<string | null>(null);

  const columns = React.useMemo(
    () =>
      col.columns([
        col.text("name", { header: "Name", size: 180 }),
        col.text("team", { header: "Team", size: 120 }),
        col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
        col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }),
        col.actions(({ row }) => (
          // Clicks inside the menu bubble to the row in React; stop them so they don't count as a row click.
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="Row actions" />}
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigator.clipboard?.writeText(row.original.email)}
                >
                  <CopyIcon /> Copy email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => row.pin(row.getIsPinned() ? false : "top")}>
                  {row.getIsPinned() ? <PinOffIcon /> : <PinIcon />}
                  {row.getIsPinned() ? "Unpin row" : "Pin row to top"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setData((prev) => prev.filter((p) => p.id !== row.original.id))}
                >
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        )),
      ]),
    [],
  );

  const grid = useDataGrid<Person>({
    name: "row-actions",
    data,
    columns,
    getRowId: (row) => row.id,
    selection: false,
    rowPinning: true,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {last ? `Last clicked: ${last}` : "Click a row."}
      </p>
      <DataGrid
        grid={grid}
        onRowClick={(row) => setLast(row.original.name)}
        getRowClassName={(row) => (row.original.status === "churned" ? "opacity-60" : undefined)}
      />
    </div>
  );
}
