import * as React from "react";
import type { RowData } from "@tanstack/react-table";

import { UTILITY_KINDS } from "./data-grid-columns";
import { copyText, toTsv } from "./data-grid-export";
import type { DataGridCell } from "./data-grid-features";
import { formatValue } from "./data-grid-format";
import type { DataGridApi } from "./use-data-grid";
import { isCommandKey } from "./data-grid-utils";

/** The DOM element of a cell, by TanStack's cell id, inside the grid root. */
export function findCellElement(root: HTMLElement | null, cellId: string): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`[data-cell-id="${CSS.escape(cellId)}"]`) ?? null;
}

/**
 * The selected cells as a tab-separated rectangle (rows in display order, columns in visible
 * order, values formatted like the cells). What ⌘C puts on the clipboard.
 */
export function selectedCellsToTsv<TData extends RowData>(
  grid: DataGridApi<TData>,
): {
  text: string;
  count: number;
} {
  const { table } = grid;
  const rowIds = new Set(table.getCellSelectionRowIds());
  const columnIds = new Set(table.getCellSelectionColumnIds());
  if (!rowIds.size || !columnIds.size) return { text: "", count: 0 };
  const columns = table.getVisibleLeafColumns().filter((c) => columnIds.has(c.id));
  const rows = table.getRowModel().rows.filter((r) => rowIds.has(r.id));
  let count = 0;
  const grid2d = rows.map((row) =>
    columns.map((column) => {
      const cell = row.getAllCellsByColumnId()[column.id] as
        | DataGridCell<TData, unknown>
        | undefined;
      if (!cell || !cell.getIsSelected()) return "";
      count++;
      return formatValue(
        cell.getValue(),
        grid.metaFor(column.id),
        row.original,
        grid.locale,
        "",
        grid.labels,
      );
    }),
  );
  return { text: toTsv({ headers: [], rows: grid2d }, { headers: false }), count };
}

/**
 * The grid's keyboard model, attached to the scroll container: arrows move the focused cell
 * (Shift extends the range), Home/End jump across the row, Ctrl+Home/End across the grid,
 * PageUp/PageDown by a screen, Enter or F2 edit, Space selects the row, ⌘A selects every cell,
 * ⌘C copies the selection as TSV, Escape clears it.
 */
export function useDataGridKeyboard<TData extends RowData>(
  grid: DataGridApi<TData>,
  scrollRef: React.RefObject<HTMLElement | null>,
  announce: (message: string) => void,
) {
  const { table } = grid;

  const focusFirstCell = React.useCallback(() => {
    const row = table.getRowModel().rows[0];
    const column = table
      .getVisibleLeafColumns()
      .find((c) => !UTILITY_KINDS.has(grid.metaFor(c.id).kind ?? "custom"));
    if (row && column) table.setFocusedCell(row.id, column.id);
  }, [table, grid]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      // An editor, a menu, a filter input, anything in the header: not ours.
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "input, textarea, select, thead, [role=menu], [role=listbox], [role=dialog], [data-slot=data-grid-filter]",
        )
      ) {
        return;
      }
      // A button or link inside a cell keeps Enter and Space for itself; arrows still navigate.
      if ((e.key === "Enter" || e.key === " ") && target.closest("button, a, [role=button]"))
        return;
      if (!grid.cellSelectionEnabled) return;
      if (grid.editing.cell) return;

      const focused = table.getFocusedCell();
      const move = (dir: "up" | "down" | "left" | "right") => {
        e.preventDefault();
        if (!focused) {
          focusFirstCell();
          return;
        }
        if (e.shiftKey) table.extendCellSelection(dir);
        else table.moveCellSelection(dir);
      };

      switch (e.key) {
        case "ArrowUp":
          return move("up");
        case "ArrowDown":
          return move("down");
        case "ArrowLeft":
          return move("left");
        case "ArrowRight":
          return move("right");
        case "Home":
        case "End": {
          e.preventDefault();
          const rows = table.getRowModel().rows;
          const columns = table
            .getVisibleLeafColumns()
            .filter((c) => !UTILITY_KINDS.has(grid.metaFor(c.id).kind ?? "custom"));
          const column = e.key === "Home" ? columns[0] : columns[columns.length - 1];
          const row = isCommandKey(e)
            ? e.key === "Home"
              ? rows[0]
              : rows[rows.length - 1]
            : (focused?.row ?? rows[0]);
          if (row && column) table.setFocusedCell(row.id, column.id);
          return;
        }
        case "PageDown":
        case "PageUp": {
          e.preventDefault();
          const rows = table.getRowModel().rows;
          const viewport = scrollRef.current?.clientHeight ?? 400;
          const step = Math.max(1, Math.floor(viewport / grid.rowHeight) - 1);
          const at = focused ? rows.findIndex((r) => r.id === focused.row.id) : 0;
          const next =
            rows[
              Math.min(rows.length - 1, Math.max(0, at + (e.key === "PageDown" ? step : -step)))
            ];
          const column = focused?.column ?? table.getVisibleLeafColumns()[0];
          if (next && column) table.setFocusedCell(next.id, column.id);
          return;
        }
        case "Enter":
        case "F2": {
          if (!focused) return;
          const cell = focused as DataGridCell<TData, unknown>;
          if (grid.editing.isEditable(cell)) {
            e.preventDefault();
            grid.editing.start(cell.row.id, cell.column.id);
          } else if (cell.row.getCanExpand()) {
            e.preventDefault();
            cell.row.toggleExpanded();
          }
          return;
        }
        case " ": {
          if (!focused || !grid.selectionEnabled) return;
          e.preventDefault();
          const row = focused.row;
          if (row.getCanSelect()) {
            row.toggleSelected(undefined, { selectChildren: true });
            announce(grid.labels.selected(table.getSelectedRowModel().rows.length));
          }
          return;
        }
        case "Escape": {
          if (table.getSelectedCellCount() > 1) {
            e.preventDefault();
            table.resetCellSelection(true);
            if (focused) table.setFocusedCell(focused.row.id, focused.column.id);
          }
          return;
        }
        case "a":
        case "A": {
          if (!isCommandKey(e)) return;
          e.preventDefault();
          table.selectAllCells();
          announce(grid.labels.selected(table.getSelectedCellCount()));
          return;
        }
        case "c":
        case "C": {
          if (!isCommandKey(e)) return;
          const { text, count } = selectedCellsToTsv(grid);
          if (!count) return;
          e.preventDefault();
          void copyText(text).then((ok) => {
            if (ok) announce(grid.labels.copied(count));
          });
          return;
        }
        default:
          return;
      }
    },
    [grid, table, scrollRef, focusFirstCell, announce],
  );

  return { onKeyDown, focusFirstCell };
}
