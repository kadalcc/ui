import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { Input } from "@/registry/kadal/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kadal/ui/select";

import { useDataGridContext } from "./data-grid-context";

export interface DataGridPaginationProps {
  className?: string;
  /** Show the "x of y selected" text (default: when selection is on). */
  showSelection?: boolean;
  /** Show the go-to-page input (default: when there are more than 5 pages). */
  showGoTo?: boolean;
}

/** Rows per page, the page position, first/previous/next/last, and the selection count. */
export function DataGridPagination<TData extends RowData>({
  className,
  showSelection,
  showGoTo,
}: DataGridPaginationProps) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  if (grid.pagination === false) return null;
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const total = table.getRowCount();
  const selected = grid.selectionEnabled ? Object.keys(table.state.rowSelection).length : 0;
  const sizes = Array.from(new Set([...grid.pagination.pageSizeOptions, pageSize])).sort((a, b) => a - b);
  const [goTo, setGoTo] = React.useState("");

  return (
    <div
      data-slot="data-grid-pagination"
      className={cn("flex flex-wrap items-center justify-between gap-2 px-1 text-sm", className)}
    >
      <div className="text-muted-foreground tabular-nums">
        {showSelection ?? grid.selectionEnabled
          ? labels.selectedOf(selected, total)
          : labels.rowsCount(total)}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2">
          <span className="hidden font-medium sm:inline">{labels.rowsPerPage}</span>
          <Select
            value={pageSize}
            onValueChange={(value) => table.setPageSize(Number(value))}
            items={sizes.map((s) => ({ value: s, label: String(s) }))}
          >
            <SelectTrigger size="sm" className="w-[4.5rem]" aria-label={labels.rowsPerPage}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {sizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-medium tabular-nums">{labels.pageOf(pageIndex + 1, pageCount)}</span>
          {(showGoTo ?? pageCount > 5) ? (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={pageCount}
              value={goTo}
              placeholder={String(pageIndex + 1)}
              aria-label={labels.goToPage}
              className="h-7 w-16 text-sm tabular-nums"
              onChange={(e) => setGoTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const n = Number(goTo);
                if (Number.isFinite(n) && n >= 1 && n <= pageCount) {
                  table.setPageIndex(n - 1);
                  setGoTo("");
                }
              }}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={labels.firstPage}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={labels.previousPage}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={labels.nextPage}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            aria-label={labels.lastPage}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
