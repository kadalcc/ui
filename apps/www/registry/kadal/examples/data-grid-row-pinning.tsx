"use client";

import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  MoreHorizontalIcon,
  PinOffIcon,
} from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kadal/ui/dropdown-menu";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
  col.date("joinedAt", { header: "Joined" }),
  col.actions(({ row }) => {
    const pinned = row.getIsPinned();
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${row.original.name}`}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {pinned !== "top" ? (
            <DropdownMenuItem onClick={() => row.pin("top")}>
              <ArrowUpToLineIcon /> Pin row to top
            </DropdownMenuItem>
          ) : null}
          {pinned !== "bottom" ? (
            <DropdownMenuItem onClick={() => row.pin("bottom")}>
              <ArrowDownToLineIcon /> Pin row to bottom
            </DropdownMenuItem>
          ) : null}
          {pinned ? (
            <DropdownMenuItem onClick={() => row.pin(false)}>
              <PinOffIcon /> Unpin row
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }),
]);

const data = makePeople(40, 31);

/** One row starts pinned to the top. Pin more from the row menu; they stay put while the rest scroll. */
export default function DataGridRowPinning() {
  return (
    <DataGrid
      name="row-pinning"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      rowPinning
      pagination={false}
      height={400}
      initialState={{ rowPinning: { top: [data[4]!.id], bottom: [] } }}
    />
  );
}
