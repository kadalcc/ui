import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/react/sortable";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowDownNarrowWideIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpNarrowWideIcon,
  ChevronsUpDownIcon,
  EllipsisVerticalIcon,
  EyeOffIcon,
  FilterIcon,
  FilterXIcon,
  GroupIcon,
  MoveHorizontalIcon,
  PinIcon,
  PinOffIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/registry/kadal/ui/badge";
import { Button } from "@/registry/kadal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/registry/kadal/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kadal/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kadal/ui/tooltip";

import { DataGridExpanderHeader, DataGridSelectHeader, alignClass } from "./data-grid-cells";
import { UTILITY_KINDS } from "./data-grid-columns";
import { useDataGridContext, useDataGridUi } from "./data-grid-context";
import type { DataGridColumn, DataGridHeader } from "./data-grid-features";
import { DataGridColumnFilter, resolveFilterKind } from "./data-grid-filters";
import { getPinningStyles, pinningClasses } from "./data-grid-pinning";
import { arrayMove } from "./data-grid-utils";

export const COLUMN_DND_GROUP = "data-grid-columns";

/**
 * The width a cell's content wants: the span from the leftmost to the rightmost text run or inline
 * box inside it. Block wrappers (the truncating span, the flex row) are as wide as the cell
 * already, so they say nothing; text nodes and inline elements (badges, icons, links) do.
 */
function contentWidth(cell: Element): number {
  let left = Infinity;
  let right = -Infinity;
  const take = (rect: DOMRect) => {
    if (rect.width === 0) return;
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  };
  const range = document.createRange();
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) continue;
      range.selectNodeContents(node);
      take(range.getBoundingClientRect());
    } else if (node instanceof Element) {
      const display = getComputedStyle(node).display;
      if (display.startsWith("inline") || node instanceof SVGElement)
        take(node.getBoundingClientRect());
    }
  }
  return right > left ? right - left : 0;
}

/** Measures the widest rendered cell of a column (header included) and sizes the column to it. */
export function autosizeColumn<TData extends RowData>(
  root: HTMLElement | null,
  column: DataGridColumn<TData, unknown>,
) {
  if (!root) return;
  const id = CSS.escape(column.id);
  let widest = 0;
  // The header: its title, plus the sort arrow and the button's own padding.
  const title = root.querySelector(
    `th[data-column-id="${id}"] [data-slot="data-grid-header-title"]`,
  );
  if (title) widest = contentWidth(title) + 44;
  // The cells: content plus the cell's horizontal padding.
  for (const cell of root.querySelectorAll(`td[data-column-id="${id}"]`)) {
    widest = Math.max(widest, contentWidth(cell) + 24);
  }
  if (widest === 0) return;
  const next = Math.min(
    column.columnDef.maxSize ?? 2000,
    Math.max(column.columnDef.minSize ?? 48, Math.ceil(widest)),
  );
  column.table.setColumnSizing((old) => ({ ...old, [column.id]: next }));
}

/** The order the headers are dragged in: the explicit order, or the natural one. */
export function currentColumnOrder<TData extends RowData>(
  table: DataGridColumn<TData, unknown>["table"],
) {
  const explicit = table.atoms.columnOrder.get();
  return explicit.length ? explicit : table.getAllLeafColumns().map((c) => c.id);
}

function moveColumn<TData extends RowData>(column: DataGridColumn<TData, unknown>, delta: 1 | -1) {
  const { table } = column;
  const order = currentColumnOrder(table);
  const visible = table.getCenterVisibleLeafColumns().map((c) => c.id);
  const at = visible.indexOf(column.id);
  const neighbour = visible[at + delta];
  if (at < 0 || !neighbour) return;
  const from = order.indexOf(column.id);
  const to = order.indexOf(neighbour);
  if (from < 0 || to < 0) return;
  table.setColumnOrder(arrayMove(order, from, to));
}

export interface DataGridColumnHeaderProps<TData extends RowData> {
  header: DataGridHeader<TData, unknown>;
  /** Position among the visible leaf headers, for the sortable list. */
  index: number;
}

/**
 * A header cell: the sortable title, the sort/filter indicators, the column menu, the filter
 * popover and the resize handle. Drag the title to reorder; stable columns (checkbox, actions)
 * render the plain version.
 */
export function DataGridColumnHeader<TData extends RowData>({
  header,
  index,
}: DataGridColumnHeaderProps<TData>) {
  const grid = useDataGridContext<TData>();
  const ui = useDataGridUi();
  const { table, labels } = grid;
  const { column } = header;
  const meta = grid.metaFor(column.id);
  const isGroupHeader = header.subHeaders.length > 0 || header.colSpan > 1;
  const utility = Boolean(meta.kind && UTILITY_KINDS.has(meta.kind));
  const pinned = column.getIsPinned();
  const stable = utility || meta.stable === true || isGroupHeader;
  const draggable = !stable && meta.draggable !== false && !pinned && !column.getIsGrouped();

  // Registered with dnd-kit only while draggable: with no handle of its own, dnd-kit would make
  // the <th> the handle and give it role="button" (and aria-disabled when off), which is wrong
  // for a column header and for the checkbox inside the select column's.
  const sortable = useSortable({
    id: column.id,
    index,
    group: COLUMN_DND_GROUP,
    type: "column",
    accept: "column",
    disabled: !draggable,
    transition: { idle: false },
  });

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const sortIndex = column.getSortIndex();
  const multiSorted = table.state.sorting.length > 1 && sorted;
  const canFilter = column.getCanFilter() && resolveFilterKind(meta) !== false;
  const filterValue = column.getFilterValue();
  const isFiltered = filterValue !== undefined;
  const filterCount = Array.isArray(filterValue) ? filterValue.length : isFiltered ? 1 : 0;
  const canGroup =
    grid.groupingEnabled && column.getCanGroup() && meta.groupable !== false && !utility;
  const canHide = column.getCanHide();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();
  const resizing = column.getIsResizing();

  const title: React.ReactNode = (() => {
    const def = column.columnDef.header;
    if (typeof def === "function") return <table.FlexRender header={header} />;
    if (meta.kind === "select" && (def === "" || def === undefined))
      return <DataGridSelectHeader {...header.getContext()} />;
    if (meta.kind === "expander" && (def === "" || def === undefined))
      return <DataGridExpanderHeader {...header.getContext()} />;
    // An explicitly empty header (the actions column) shows nothing; menus still get the label.
    if (def === "") return null;
    return grid.labelFor(column.id);
  })();
  // The title, with the column's `description` as a tooltip when there is one.
  const titleNode = meta.description ? (
    <Tooltip>
      <TooltipTrigger render={<span className="truncate" data-slot="data-grid-header-title" />}>
        {title}
      </TooltipTrigger>
      <TooltipContent side="bottom">{meta.description}</TooltipContent>
    </Tooltip>
  ) : (
    <span className="truncate" data-slot="data-grid-header-title">
      {title}
    </span>
  );

  const ariaSort = !canSort
    ? undefined
    : sorted === "asc"
      ? "ascending"
      : sorted === "desc"
        ? "descending"
        : "none";

  const onSortClick = (e: React.MouseEvent) => {
    if (!canSort) return;
    column.getToggleSortingHandler()?.(e);
    const next = column.getIsSorted();
    ui.announce(
      next === "asc"
        ? `${grid.labelFor(column.id)}: ${labels.sortAsc}`
        : next === "desc"
          ? `${grid.labelFor(column.id)}: ${labels.sortDesc}`
          : `${grid.labelFor(column.id)}: ${labels.clearSort}`,
    );
  };

  const pinningStyle = getPinningStyles(column, { header: true });

  if (isGroupHeader) {
    // A group spans its leaves: its width is theirs added up, not the group column's own size.
    const groupSize = header.getSize();
    return (
      <th
        ref={draggable ? sortable.ref : undefined}
        colSpan={header.colSpan}
        scope="colgroup"
        data-column-id={column.id}
        className={cn(
          "h-(--dg-row-height) border-b bg-background px-2 text-center align-middle text-xs font-medium whitespace-nowrap text-muted-foreground",
          pinningClasses(column),
        )}
        style={{ ...pinningStyle, width: groupSize, minWidth: groupSize, maxWidth: groupSize }}
      >
        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
      </th>
    );
  }

  return (
    <th
      ref={draggable ? sortable.ref : undefined}
      colSpan={header.colSpan}
      scope="col"
      role="columnheader"
      aria-sort={ariaSort}
      aria-colindex={index + 1}
      data-column-id={column.id}
      data-pinned={pinned || undefined}
      data-dragging={sortable.isDragging || undefined}
      data-drop-target={sortable.isDropTarget || undefined}
      className={cn(
        "group/head relative h-(--dg-row-height) border-b bg-background p-0 text-start align-middle font-medium whitespace-nowrap select-none",
        sortable.isDragging && "z-40 opacity-80",
        sortable.isDropTarget && "bg-accent/60",
        pinningClasses(column),
        meta.headerClassName,
      )}
      style={pinningStyle}
      onContextMenu={
        utility
          ? undefined
          : (e) => {
              e.preventDefault();
              setMenuOpen(true);
            }
      }
    >
      <div className={cn("flex h-full items-center gap-0.5 px-1", alignClass(meta.align))}>
        {header.isPlaceholder ? null : canSort ? (
          <button
            ref={draggable ? sortable.handleRef : undefined}
            type="button"
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 text-start text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
              draggable && "cursor-grab active:cursor-grabbing",
              meta.align === "end" && "flex-row-reverse text-end",
              meta.align === "center" && "justify-center",
            )}
            onClick={onSortClick}
            title={draggable ? labels.dragColumn : undefined}
          >
            {pinned ? <PinIcon className="size-3 shrink-0 text-muted-foreground" /> : null}
            {titleNode}
            {sorted === "asc" ? (
              <ArrowUpIcon className="size-3.5 shrink-0" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="size-3.5 shrink-0" />
            ) : (
              <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover/head:opacity-100" />
            )}
            {multiSorted ? (
              <span className="rounded-sm bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground">
                {sortIndex + 1}
              </span>
            ) : null}
            {isFiltered ? (
              <FilterIcon className="size-3 shrink-0 fill-current text-muted-foreground" />
            ) : null}
          </button>
        ) : (
          <div
            // The drag handle's attributes (role, aria-disabled) belong only on a draggable header;
            // on a checkbox column they would describe the checkbox inside as disabled.
            ref={draggable ? sortable.handleRef : undefined}
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center gap-1 px-1.5 text-sm font-medium",
              draggable && "cursor-grab active:cursor-grabbing",
              meta.align === "end" && "justify-end",
              meta.align === "center" && "justify-center",
            )}
          >
            {pinned && !utility ? (
              <PinIcon className="size-3 shrink-0 text-muted-foreground" />
            ) : null}
            {titleNode}
          </div>
        )}

        <div
          data-active={isFiltered || menuOpen || filterOpen || undefined}
          className="absolute inset-y-0 right-1 flex items-center gap-0.5 bg-background/95 pl-1 opacity-0 transition-opacity group-hover/head:opacity-100 focus-within:opacity-100 data-active:opacity-100"
        >
          {canFilter ? (
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "shrink-0 text-muted-foreground",
                      isFiltered && "text-foreground",
                    )}
                    aria-label={`${labels.filter}: ${grid.labelFor(column.id)}`}
                  />
                }
              >
                {isFiltered && filterCount > 1 ? (
                  <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px]">
                    {filterCount}
                  </Badge>
                ) : (
                  <FilterIcon className={cn(isFiltered && "fill-current")} />
                )}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 gap-2" data-slot="data-grid-filter">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {labels.filter}: {grid.labelFor(column.id)}
                  </span>
                  {isFiltered ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={labels.clearFilters}
                      onClick={() => column.setFilterValue(undefined)}
                    >
                      <FilterXIcon />
                    </Button>
                  ) : null}
                </div>
                <DataGridColumnFilter column={column} />
              </PopoverContent>
            </Popover>
          ) : null}

          {utility ? null : (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-muted-foreground"
                    aria-label={`${grid.labelFor(column.id)}: ${labels.columnMenu}`}
                  />
                }
              >
                <EllipsisVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canSort ? (
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                      <ArrowUpNarrowWideIcon /> {labels.sortAsc}
                      {sorted === "asc" ? (
                        <DropdownMenuShortcut>{labels.applied}</DropdownMenuShortcut>
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                      <ArrowDownNarrowWideIcon /> {labels.sortDesc}
                      {sorted === "desc" ? (
                        <DropdownMenuShortcut>{labels.applied}</DropdownMenuShortcut>
                      ) : null}
                    </DropdownMenuItem>
                    {sorted ? (
                      <DropdownMenuItem onClick={() => column.clearSorting()}>
                        <XIcon /> {labels.clearSort}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                ) : null}
                {canFilter ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterOpen(true)}>
                      <FilterIcon /> {labels.filter}…
                      {isFiltered ? (
                        <DropdownMenuShortcut>{labels.applied}</DropdownMenuShortcut>
                      ) : null}
                    </DropdownMenuItem>
                  </>
                ) : null}
                {canPin ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {pinned !== "start" ? (
                        <DropdownMenuItem onClick={() => column.pin("start")}>
                          <PinIcon /> {labels.pinStart}
                        </DropdownMenuItem>
                      ) : null}
                      {pinned !== "end" ? (
                        <DropdownMenuItem onClick={() => column.pin("end")}>
                          <PinIcon className="-scale-x-100" /> {labels.pinEnd}
                        </DropdownMenuItem>
                      ) : null}
                      {pinned ? (
                        <DropdownMenuItem onClick={() => column.pin(false)}>
                          <PinOffIcon /> {labels.unpin}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {!pinned ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => moveColumn(column, -1)}
                        disabled={column.getIsFirstColumn("center")}
                      >
                        <ArrowLeftIcon /> {labels.moveLeft}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveColumn(column, 1)}
                        disabled={column.getIsLastColumn("center")}
                      >
                        <ArrowRightIcon /> {labels.moveRight}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {canGroup ? (
                    <DropdownMenuItem onClick={() => column.toggleGrouping()}>
                      <GroupIcon />{" "}
                      {column.getIsGrouped()
                        ? labels.ungroup
                        : labels.groupBy(grid.labelFor(column.id))}
                    </DropdownMenuItem>
                  ) : null}
                  {canResize ? (
                    <DropdownMenuItem onClick={() => autosizeColumn(ui.rootRef.current, column)}>
                      <MoveHorizontalIcon /> {labels.autosize}
                    </DropdownMenuItem>
                  ) : null}
                  {canHide ? (
                    <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                      <EyeOffIcon /> {labels.hideColumn}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {canResize ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={labels.resizeColumn}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => autosizeColumn(ui.rootRef.current, column)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-0 -right-px z-10 h-full w-2 cursor-col-resize touch-none select-none",
            "after:absolute after:top-1/4 after:right-[3px] after:h-1/2 after:w-px after:rounded-full after:bg-border after:opacity-0 after:transition-opacity group-hover/head:after:opacity-100",
            resizing && "after:bg-primary after:opacity-100",
          )}
        />
      ) : null}
    </th>
  );
}
