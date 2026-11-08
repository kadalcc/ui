import * as React from "react";
import { flexRender, type RowData } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { isSortable } from "@dnd-kit/react/sortable";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { cn } from "@/lib/utils";
import { InboxIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kadal/ui/empty";
import { Spinner } from "@/registry/kadal/ui/spinner";

import { DataGridGroupCell, alignClass } from "./data-grid-cells";
import { DataGridColumnHeader, currentColumnOrder } from "./data-grid-column-header";
import { useDataGridContext, useDataGridUi } from "./data-grid-context";
import { DataGridCellEditor } from "./data-grid-editing";
import type { DataGridCell, DataGridRow } from "./data-grid-features";
import { findCellElement, useDataGridKeyboard } from "./data-grid-keyboard";
import { getPinningStyles, pinningClasses } from "./data-grid-pinning";
import { arrayMove, useFillHeight } from "./data-grid-utils";

export interface DataGridTableProps<TData extends RowData> {
  className?: string;
  /** A fixed height for the scroll area (needed for virtualization). */
  height?: number | string;
  /** Fill from the grid's top edge to the bottom of its scroll parent, console-style. */
  fillHeight?: boolean;
  /** Keep the header visible while the body scrolls. Default true. */
  stickyHeader?: boolean;
  /** Alternate row tint. */
  striped?: boolean;
  getRowClassName?: (row: DataGridRow<TData>) => string | undefined;
  onRowClick?: (row: DataGridRow<TData>, event: React.MouseEvent) => void;
}

/** The table itself: header, body (virtualized when large), footer, and the loading/empty overlays. */
export function DataGridTable<TData extends RowData>({
  className,
  height,
  fillHeight = false,
  stickyHeader = true,
  striped = false,
  getRowClassName,
  onRowClick,
}: DataGridTableProps<TData>) {
  const grid = useDataGridContext<TData>();
  const ui = useDataGridUi();
  const { table, labels } = grid;
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const headerRowRef = React.useRef<HTMLTableRowElement | null>(null);
  const filled = useFillHeight(scrollRef, fillHeight);

  // Pinned rows render outside the virtual list, so they stay mounted (and sticky) however far
  // the rest scrolls. TanStack memoises these getters; no need to again.
  const rowModel = table.getRowModel();
  const topRows = grid.rowPinningEnabled ? table.getTopRows() : NO_ROWS;
  const bottomRows = grid.rowPinningEnabled ? table.getBottomRows() : NO_ROWS;
  const rows = grid.rowPinningEnabled ? table.getCenterRows() : rowModel.rows;
  const leafColumns = table.getVisibleLeafColumns();
  const totalRows = table.getRowCount();

  // ── Virtualization ───────────────────────────────────────────────────────────────────────────
  const virtual = grid.virtualizeRows;
  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => grid.rowHeight,
    overscan: grid.virtualizeOptions.overscan,
    getItemKey: (index) => rows[index]?.id ?? index,
  });
  const virtualItems = virtual ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtual && virtualItems.length ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtual && virtualItems.length
      ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  // ── Column drag-to-reorder ───────────────────────────────────────────────────────────────────
  const orderBeforeDrag = React.useRef<string[] | null>(null);
  const sensors = React.useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
      }),
    ],
    [],
  );
  const modifiers = React.useMemo(
    () => [RestrictToElement.configure({ element: () => headerRowRef.current })],
    [],
  );

  // ── Keyboard + focus ─────────────────────────────────────────────────────────────────────────
  const { onKeyDown } = useDataGridKeyboard(grid, scrollRef, ui.announce);
  const focusedCell = grid.cellSelectionEnabled ? table.getFocusedCell() : undefined;
  const focusedId = focusedCell?.id;
  const pendingFocus = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!focusedId) return;
    const root = scrollRef.current;
    if (!root) return;
    // Only steal focus when the user is already working in the grid.
    const active = document.activeElement;
    const within = active && root.contains(active);
    if (!within && pendingFocus.current !== focusedId) return;
    const el = findCellElement(root, focusedId);
    if (el) {
      if (active !== el && !el.contains(active)) el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      pendingFocus.current = null;
    } else if (virtual && focusedCell) {
      const index = rows.findIndex((r) => r.id === focusedCell.row.id);
      if (index >= 0) {
        pendingFocus.current = focusedId;
        virtualizer.scrollToIndex(index, { align: "auto" });
      }
    }
  });

  const onEditorDone = React.useCallback(
    (direction?: "next" | "previous" | "down") => {
      const cell = table.getFocusedCell();
      if (direction === "next") table.moveCellSelection("right");
      else if (direction === "previous") table.moveCellSelection("left");
      else if (direction === "down") table.moveCellSelection("down");
      const target = table.getFocusedCell() ?? cell;
      if (target) {
        pendingFocus.current = target.id;
        findCellElement(scrollRef.current, target.id)?.focus({ preventScroll: true });
      }
    },
    [table],
  );

  // ── Footer ───────────────────────────────────────────────────────────────────────────────────
  const hasFooter = leafColumns.some((c) => c.columnDef.footer !== undefined);

  const isFiltered = table.state.columnFilters.length > 0 || Boolean(table.state.globalFilter);
  const empty = rows.length === 0 && topRows.length === 0 && bottomRows.length === 0;
  const overlay: "loading" | "error" | "empty" | null = ui.error
    ? "error"
    : empty && ui.loading
      ? "loading"
      : empty
        ? "empty"
        : null;

  const headerGroups = table.getHeaderGroups();

  return (
    <DragDropProvider
      sensors={sensors}
      modifiers={modifiers}
      onDragStart={() => {
        orderBeforeDrag.current = currentColumnOrder(table);
      }}
      onDragOver={(event) => {
        const { source, target } = event.operation;
        if (!source || !target || !isSortable(source) || !isSortable(target)) return;
        if (source.id === target.id) return;
        const order = currentColumnOrder(table);
        const from = order.indexOf(String(source.id));
        const to = order.indexOf(String(target.id));
        if (from < 0 || to < 0) return;
        table.setColumnOrder(arrayMove(order, from, to));
      }}
      onDragEnd={(event) => {
        if (event.canceled && orderBeforeDrag.current)
          table.setColumnOrder(orderBeforeDrag.current);
        orderBeforeDrag.current = null;
      }}
    >
      <div
        data-slot="data-grid-viewport"
        className={cn(
          "relative flex min-h-0 flex-col rounded-lg border bg-background",
          // A fixed height wins over flexing; otherwise fill whatever the parent gives.
          height !== undefined || filled !== undefined ? "flex-none" : "flex-1",
          // With no rows and no height of its own, leave room for the message below the header.
          overlay && height === undefined && filled === undefined && "min-h-48",
          className,
        )}
        style={{ height: height ?? filled }}
      >
        <div
          ref={scrollRef}
          role="grid"
          aria-rowcount={totalRows + headerGroups.length}
          aria-colcount={leafColumns.length}
          aria-multiselectable={
            grid.selectionEnabled && table.options.enableMultiRowSelection !== false
          }
          aria-busy={ui.loading || undefined}
          aria-describedby={undefined}
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-auto rounded-[inherit] outline-none",
            // A scrollbar that is there before the reader scrolls: macOS hides the native one until
            // then, and a grid wider than its box looked cut off, not scrollable.
            "[&::-webkit-scrollbar]:size-2.5 [&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-foreground/25 [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-foreground/40",
            "[&::-webkit-scrollbar-corner]:bg-transparent",
          )}
          onKeyDown={onKeyDown}
        >
          <table
            data-slot="data-grid-table"
            className={cn(
              "shrink-0 caption-bottom text-sm",
              grid.cellSelectionEnabled && "select-none",
            )}
            style={{
              // Fill the box when the columns are narrower than it (the extra width is shared out
              // in proportion), never shrink below their sum: that is when the box scrolls. Widths
              // come from the header cells, not a <colgroup>: with one, dnd-kit drops a dragged
              // header one column short in Firefox.
              width: "100%",
              minWidth: table.getTotalSize(),
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead
              className={cn("bg-background", stickyHeader && "sticky top-0 z-20")}
              role="rowgroup"
            >
              {headerGroups.map((headerGroup, groupIndex) => (
                <tr
                  key={headerGroup.id}
                  ref={groupIndex === headerGroups.length - 1 ? headerRowRef : undefined}
                  role="row"
                  aria-rowindex={groupIndex + 1}
                >
                  {headerGroup.headers.map((header, index) => (
                    <DataGridColumnHeader key={header.id} header={header} index={index} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody role="rowgroup">
              {topRows.map((row, i) => (
                <DataGridRowView
                  key={row.id}
                  row={row}
                  index={i}
                  pinnedOffset={i}
                  striped={striped}
                  className={getRowClassName?.(row)}
                  onClick={onRowClick}
                  onEditorDone={onEditorDone}
                  headerRows={headerGroups.length}
                  footerRows={hasFooter ? 1 : 0}
                />
              ))}
              {paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td style={{ height: paddingTop, padding: 0 }} colSpan={leafColumns.length} />
                </tr>
              ) : null}
              {(virtual
                ? virtualItems.map((item) => ({
                    row: rows[item.index]!,
                    item,
                    position: item.index,
                  }))
                : rows.map((row, position) => ({ row, item: null, position }))
              ).map(({ row, item, position }) => (
                <DataGridRowView
                  key={row.id}
                  row={row}
                  measureRef={item ? virtualizer.measureElement : undefined}
                  index={topRows.length + position}
                  pinnedOffset={0}
                  striped={striped}
                  className={getRowClassName?.(row)}
                  onClick={onRowClick}
                  onEditorDone={onEditorDone}
                  headerRows={headerGroups.length}
                  footerRows={hasFooter ? 1 : 0}
                />
              ))}
              {paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td style={{ height: paddingBottom, padding: 0 }} colSpan={leafColumns.length} />
                </tr>
              ) : null}
              {bottomRows.map((row, i) => (
                <DataGridRowView
                  key={row.id}
                  row={row}
                  index={topRows.length + rows.length + i}
                  pinnedOffset={bottomRows.length - 1 - i}
                  striped={striped}
                  className={getRowClassName?.(row)}
                  onClick={onRowClick}
                  onEditorDone={onEditorDone}
                  headerRows={headerGroups.length}
                  footerRows={hasFooter ? 1 : 0}
                />
              ))}
            </tbody>
            {hasFooter ? (
              <tfoot className="sticky bottom-0 z-10 bg-muted/60 backdrop-blur">
                {table.getFooterGroups().map((group) => (
                  <tr key={group.id} role="row">
                    {group.headers.map((header) => (
                      <td
                        key={header.id}
                        role="gridcell"
                        className={cn(
                          "h-(--dg-row-height) border-t px-2 text-sm font-medium",
                          alignClass(grid.metaFor(header.column.id).align),
                          pinningClasses(header.column),
                        )}
                        style={getPinningStyles(header.column)}
                      >
                        {header.isPlaceholder ? null : <table.FlexRender footer={header} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tfoot>
            ) : null}
          </table>
          {/* Dotted texture below the last row when the viewport is taller than the rows. */}
          <div
            aria-hidden="true"
            className="min-h-0 flex-1 bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_14%,transparent)_0.5px,transparent_0.5px)] bg-[size:3px_3px]"
            style={{ minWidth: table.getTotalSize() }}
          />
        </div>

        {ui.loading && !empty ? (
          <div
            role="progressbar"
            aria-label={labels.loading}
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden rounded-t-[inherit]"
          >
            <div className="h-full w-full animate-pulse bg-primary/70" />
          </div>
        ) : null}

        {overlay ? (
          <div
            className={cn(
              "absolute inset-0 z-30 flex items-center justify-center p-6",
              overlay === "loading" && "pointer-events-none",
            )}
            style={{ top: `var(--dg-row-height)` }}
          >
            {overlay === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> {labels.loading}
              </div>
            ) : overlay === "error" ? (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TriangleAlertIcon />
                  </EmptyMedia>
                  <EmptyTitle>{labels.error}</EmptyTitle>
                  <EmptyDescription>{ui.error}</EmptyDescription>
                </EmptyHeader>
                {ui.onRetry ? (
                  <Button variant="outline" size="sm" onClick={ui.onRetry}>
                    {labels.retry}
                  </Button>
                ) : null}
              </Empty>
            ) : (
              (ui.emptyState ?? (
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      {isFiltered ? <SearchXIcon /> : <InboxIcon />}
                    </EmptyMedia>
                    <EmptyTitle>{isFiltered ? labels.emptyFiltered : labels.empty}</EmptyTitle>
                  </EmptyHeader>
                  {isFiltered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        table.resetColumnFilters();
                        table.resetGlobalFilter(true);
                      }}
                    >
                      {labels.clearFilters}
                    </Button>
                  ) : null}
                </Empty>
              ))
            )}
          </div>
        ) : null}
      </div>
    </DragDropProvider>
  );
}

// ── Rows and cells ────────────────────────────────────────────────────────────────────────────────

const NO_ROWS: never[] = [];

interface DataGridRowViewProps<TData extends RowData> {
  row: DataGridRow<TData>;
  index: number;
  /** For a pinned row: how many pinned rows sit between it and the edge it sticks to. */
  pinnedOffset: number;
  measureRef?: (el: HTMLTableRowElement | null) => void;
  striped: boolean;
  className?: string;
  onClick?: (row: DataGridRow<TData>, event: React.MouseEvent) => void;
  onEditorDone: (direction?: "next" | "previous" | "down") => void;
  headerRows: number;
  footerRows: number;
}

function DataGridRowView<TData extends RowData>({
  row,
  index,
  pinnedOffset,
  measureRef,
  striped,
  className,
  onClick,
  onEditorDone,
  headerRows,
  footerRows,
}: DataGridRowViewProps<TData>) {
  const grid = useDataGridContext<TData>();
  const { table } = grid;
  const selected = row.getIsSelected();
  const pinned = grid.rowPinningEnabled ? row.getIsPinned() : false;
  const hasSelectColumn = table
    .getVisibleLeafColumns()
    .some((c) => grid.metaFor(c.id).kind === "select");
  const grouped = row.getIsGrouped();

  return (
    <tr
      ref={measureRef}
      data-index={index}
      data-row-id={row.id}
      data-state={selected ? "selected" : undefined}
      data-grouped={grouped || undefined}
      data-pinned={pinned || undefined}
      role="row"
      aria-rowindex={index + headerRows + 1}
      aria-selected={grid.selectionEnabled ? selected : undefined}
      aria-expanded={row.getCanExpand() ? row.getIsExpanded() : undefined}
      aria-level={row.depth + 1}
      className={cn(
        "group/row h-(--dg-row-height) transition-colors hover:bg-muted/40",
        striped && index % 2 === 1 && "bg-muted/20",
        grouped && "bg-muted/30 font-medium",
        selected && "bg-primary/5 hover:bg-primary/10",
        pinned === "top" && "sticky z-10 bg-background shadow-[inset_0_-1px_0_0_var(--border)]",
        pinned === "bottom" && "sticky z-10 bg-background shadow-[inset_0_1px_0_0_var(--border)]",
        className,
      )}
      // Each pinned row sticks just past the ones before it (and the header, or the footer).
      style={
        pinned === "top"
          ? { top: `calc(var(--dg-row-height) * ${headerRows + pinnedOffset})` }
          : pinned === "bottom"
            ? { bottom: `calc(var(--dg-row-height) * ${footerRows + pinnedOffset})` }
            : undefined
      }
      onClick={(e) => {
        onClick?.(row, e);
        if (e.defaultPrevented) return;
        // No checkbox column: the row itself toggles selection.
        if (
          grid.selectionEnabled &&
          !hasSelectColumn &&
          !grid.cellSelectionEnabled &&
          row.getCanSelect()
        ) {
          row.getToggleSelectedHandler()(e);
        }
      }}
    >
      {row.getVisibleCells().map((cell, colIndex) => (
        <DataGridCellView
          key={cell.id}
          cell={cell}
          colIndex={colIndex}
          onEditorDone={onEditorDone}
        />
      ))}
    </tr>
  );
}

function DataGridCellView<TData extends RowData>({
  cell,
  colIndex,
  onEditorDone,
}: {
  cell: DataGridCell<TData, unknown>;
  colIndex: number;
  onEditorDone: (direction?: "next" | "previous" | "down") => void;
}) {
  const grid = useDataGridContext<TData>();
  const { table } = grid;
  const { column, row } = cell;
  const meta = grid.metaFor(column.id);
  const cellSelection = grid.cellSelectionEnabled && cell.getCanSelect();
  const isSelected = cellSelection && cell.getIsSelected();
  const isFocused = cellSelection && cell.getIsFocused();
  const edges = isSelected ? cell.getSelectionEdges() : null;
  const isEditing =
    grid.editing.cell?.rowId === row.id && grid.editing.cell?.columnId === column.id;
  const editor = grid.editing.enabled && !row.getIsGrouped() ? grid.editing.editorFor(cell) : null;
  const value = cell.getValue();
  const extraClass =
    typeof meta.cellClassName === "function"
      ? meta.cellClassName(value, row.original)
      : meta.cellClassName;

  let content: React.ReactNode;
  if (isEditing && editor) {
    content = <DataGridCellEditor cell={cell} spec={editor} onDone={onEditorDone} />;
  } else if (cell.getIsGrouped()) {
    content = <DataGridGroupCell {...cell.getContext()} />;
  } else if (cell.getIsAggregated()) {
    content = flexRender(
      column.columnDef.aggregatedCell ?? column.columnDef.cell,
      cell.getContext(),
    );
  } else if (cell.getIsPlaceholder()) {
    content = null;
  } else {
    content = flexRender(column.columnDef.cell, cell.getContext());
  }

  return (
    <td
      role="gridcell"
      data-cell-id={cell.id}
      data-column-id={column.id}
      data-kind={meta.kind}
      data-selected={isSelected || undefined}
      data-focused={isFocused || undefined}
      data-editing={isEditing || undefined}
      data-editable={editor ? true : undefined}
      aria-colindex={colIndex + 1}
      aria-selected={cellSelection ? isSelected : undefined}
      aria-readonly={grid.editing.enabled && !editor ? true : undefined}
      tabIndex={cellSelection ? cell.getTabIndex() : -1}
      className={cn(
        "relative h-(--dg-row-height) overflow-hidden border-b px-2 align-middle text-sm outline-none",
        meta.wrap ? "whitespace-normal" : "whitespace-nowrap",
        alignClass(meta.align),
        pinningClasses(column),
        isSelected && "bg-primary/10",
        isFocused && "ring-2 ring-primary ring-inset",
        edges?.top && "shadow-[inset_0_1px_0_0_var(--primary)]",
        edges?.bottom && "shadow-[inset_0_-1px_0_0_var(--primary)]",
        edges?.left && "shadow-[inset_1px_0_0_0_var(--primary)]",
        edges?.right && "shadow-[inset_-1px_0_0_0_var(--primary)]",
        editor && !isEditing && "cursor-text",
        isEditing && "p-0.5",
        meta.kind === "select" && "pr-0",
        extraClass,
      )}
      style={getPinningStyles(column)}
      onMouseDown={cellSelection && !isEditing ? cell.getSelectionStartHandler() : undefined}
      onMouseEnter={
        cellSelection && table._isSelectingCells ? cell.getSelectionExtendHandler() : undefined
      }
      onDoubleClick={
        editor && !isEditing
          ? (e) => {
              e.preventDefault();
              grid.editing.start(row.id, column.id);
            }
          : undefined
      }
    >
      {content}
    </td>
  );
}
