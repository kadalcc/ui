import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

import { Button } from "@/registry/kadal/ui/button";
import { TooltipProvider } from "@/registry/kadal/ui/tooltip";

import { DataGridProvider, DataGridUiProvider, useDataGridContext, type DataGridUiState } from "./data-grid-context";
import type { DataGridRow } from "./data-grid-features";
import { DataGridPagination, type DataGridPaginationProps } from "./data-grid-pagination";
import { DataGridTable, type DataGridTableProps } from "./data-grid-table";
import { DataGridToolbar, type DataGridToolbarProps } from "./data-grid-toolbar";
import { useDataGrid, type DataGridApi, type UseDataGridOptions } from "./use-data-grid";

// ── Root ──────────────────────────────────────────────────────────────────────────────────────────

export interface DataGridRootProps<TData extends RowData> {
  grid: DataGridApi<TData>;
  className?: string;
  children: React.ReactNode;
  /** Shows the progress bar (with rows) or the loading state (without). Pair with a query's `isFetching`. */
  loading?: boolean;
  /** Shows the error state. */
  error?: React.ReactNode;
  onRetry?: () => void;
  /** Replaces the default empty state. */
  emptyState?: React.ReactNode;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

/**
 * The provider and frame every grid part lives in. Use it to compose your own layout:
 *
 * ```tsx
 * <DataGridRoot grid={grid}>
 *   <DataGridToolbar>
 *     <Button>New order</Button>
 *   </DataGridToolbar>
 *   <DataGridTable height={560} />
 *   <DataGridPagination />
 * </DataGridRoot>
 * ```
 */
export function DataGridRoot<TData extends RowData>({
  grid,
  className,
  children,
  loading = false,
  error = null,
  onRetry,
  emptyState,
  fullscreen: fullscreenProp,
  onFullscreenChange,
}: DataGridRootProps<TData>) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [fullscreenState, setFullscreenState] = React.useState(false);
  const fullscreen = fullscreenProp ?? fullscreenState;
  const setFullscreen = React.useCallback(
    (on: boolean) => {
      setFullscreenState(on);
      onFullscreenChange?.(on);
    },
    [onFullscreenChange],
  );
  const [announcement, setAnnouncement] = React.useState("");
  const announce = React.useCallback((message: string) => {
    // Re-announce identical messages by clearing first.
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 20);
  }, []);

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-slot=data-grid] [data-editing]")) {
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [fullscreen, setFullscreen]);

  const ui: DataGridUiState = React.useMemo(
    () => ({
      rootRef,
      fullscreen,
      setFullscreen,
      loading,
      error: error ?? null,
      onRetry,
      emptyState,
      announce,
      announcement,
    }),
    [fullscreen, setFullscreen, loading, error, onRetry, emptyState, announce, announcement],
  );

  return (
    <DataGridProvider grid={grid}>
      <DataGridUiProvider value={ui}>
        <TooltipProvider>
          <div
            ref={rootRef}
            data-slot="data-grid"
            data-density={grid.density}
            data-fullscreen={fullscreen || undefined}
            className={cn(
              "flex min-h-0 flex-col gap-3 text-foreground",
              fullscreen && "fixed inset-0 z-50 bg-background p-4",
              className,
            )}
            style={{ "--dg-row-height": `${grid.rowHeight}px` } as React.CSSProperties}
          >
            {children}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {announcement}
            </div>
          </div>
        </TooltipProvider>
      </DataGridUiProvider>
    </DataGridProvider>
  );
}

// ── Bulk actions ──────────────────────────────────────────────────────────────────────────────────

export interface DataGridBulkActionsProps<TData extends RowData> {
  className?: string;
  /** Your actions, given the selected rows. */
  children?: (rows: TData[], api: DataGridApi<TData>) => React.ReactNode;
}

/** A bar that appears while rows are selected: the count, "clear", and your actions. */
export function DataGridBulkActions<TData extends RowData>({
  className,
  children,
}: DataGridBulkActionsProps<TData>) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const selectedIds = table.state.rowSelection;
  const count = Object.keys(selectedIds).length;
  if (!count) return null;
  const rows = table.getSelectedRowModel().rows.map((r) => r.original);
  return (
    <div
      role="toolbar"
      aria-label={labels.selected(count)}
      data-slot="data-grid-bulk-actions"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md",
        className,
      )}
    >
      <span className="font-medium tabular-nums">{labels.selected(count)}</span>
      <Button variant="ghost" size="xs" onClick={() => table.resetRowSelection(true)}>
        <XIcon /> {labels.clearSelection}
      </Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children?.(rows, grid)}</div>
    </div>
  );
}

// ── All in one ────────────────────────────────────────────────────────────────────────────────────

export interface DataGridProps<TData extends RowData>
  extends UseDataGridOptions<TData>,
    Omit<DataGridTableProps<TData>, "className">,
    Omit<DataGridRootProps<TData>, "grid" | "children" | "className"> {
  /** An instance from `useDataGrid`, when you need the api outside the component. */
  grid?: DataGridApi<TData>;
  className?: string;
  /** `false` hides the toolbar; a node replaces it; an object configures it. */
  toolbar?: boolean | React.ReactNode | DataGridToolbarProps;
  /** Controls inside the built-in toolbar, on the right. */
  toolbarActions?: React.ReactNode;
  /** `false` hides the pager (rows still page unless `pagination: false`). */
  pager?: boolean | DataGridPaginationProps;
  /** Rendered in the bulk-actions bar while rows are selected. */
  bulkActions?: (rows: TData[], api: DataGridApi<TData>) => React.ReactNode;
  /** Classes for the table viewport. */
  tableClassName?: string;
}

/**
 * The whole grid in one component: toolbar, table, pager and bulk actions, driven by the same
 * options as `useDataGrid`.
 */
export function DataGrid<TData extends RowData>(props: DataGridProps<TData>) {
  if (props.grid) return <DataGridView {...props} grid={props.grid} />;
  return <DataGridWithHook {...props} />;
}

function DataGridWithHook<TData extends RowData>(props: DataGridProps<TData>) {
  const {
    className,
    toolbar,
    toolbarActions,
    pager,
    bulkActions,
    tableClassName,
    height,
    fillHeight,
    stickyHeader,
    striped,
    getRowClassName,
    onRowClick,
    loading,
    error,
    onRetry,
    emptyState,
    fullscreen,
    onFullscreenChange,
    grid: _grid,
    ...hookOptions
  } = props;
  const grid = useDataGrid<TData>(hookOptions);
  return (
    <DataGridView
      grid={grid}
      className={className}
      toolbar={toolbar}
      toolbarActions={toolbarActions}
      pager={pager}
      bulkActions={bulkActions}
      tableClassName={tableClassName}
      height={height}
      fillHeight={fillHeight}
      stickyHeader={stickyHeader}
      striped={striped}
      getRowClassName={getRowClassName}
      onRowClick={onRowClick}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyState={emptyState}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
    />
  );
}

type DataGridViewProps<TData extends RowData> = Pick<
  DataGridProps<TData>,
  | "className"
  | "toolbar"
  | "toolbarActions"
  | "pager"
  | "bulkActions"
  | "tableClassName"
  | "height"
  | "fillHeight"
  | "stickyHeader"
  | "striped"
  | "getRowClassName"
  | "onRowClick"
  | "loading"
  | "error"
  | "onRetry"
  | "emptyState"
  | "fullscreen"
  | "onFullscreenChange"
> & { grid: DataGridApi<TData> };

function DataGridView<TData extends RowData>({
  grid,
  className,
  toolbar = true,
  toolbarActions,
  pager = true,
  bulkActions,
  tableClassName,
  height,
  fillHeight,
  stickyHeader,
  striped,
  getRowClassName,
  onRowClick,
  loading,
  error,
  onRetry,
  emptyState,
  fullscreen,
  onFullscreenChange,
}: DataGridViewProps<TData>) {
  const toolbarNode =
    toolbar === false ? null : toolbar === true || toolbar === undefined ? (
      <DataGridToolbar>{toolbarActions}</DataGridToolbar>
    ) : React.isValidElement(toolbar) || typeof toolbar !== "object" ? (
      toolbar
    ) : (
      <DataGridToolbar {...(toolbar as DataGridToolbarProps)}>{toolbarActions}</DataGridToolbar>
    );
  return (
    <DataGridRoot
      grid={grid}
      className={className}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyState={emptyState}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
    >
      {toolbarNode}
      {bulkActions ? <DataGridBulkActions>{bulkActions}</DataGridBulkActions> : null}
      <DataGridTable
        className={tableClassName}
        height={height}
        fillHeight={fillHeight ?? (height === undefined && grid.virtualizeRows)}
        stickyHeader={stickyHeader}
        striped={striped}
        getRowClassName={getRowClassName}
        onRowClick={onRowClick}
      />
      {pager === false || grid.pagination === false ? null : (
        <DataGridPagination {...(typeof pager === "object" ? pager : {})} />
      )}
    </DataGridRoot>
  );
}

export type { DataGridRow };
