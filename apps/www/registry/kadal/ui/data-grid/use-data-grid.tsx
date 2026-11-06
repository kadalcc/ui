import * as React from "react";
import {
  useTable,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type GroupingState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";

import { DataGridAggregatedCell, DataGridDefaultCell } from "./data-grid-cells";
import { UTILITY_KINDS } from "./data-grid-columns";
import {
  copyText,
  downloadFile,
  slugifyFilename,
  toCsv,
  toJson,
  toTsv,
  type ExportTable,
} from "./data-grid-export";
import {
  dataGridFeatures,
  type DataGridCell,
  type DataGridColumnDef,
  type DataGridReactTable,
  type DataGridState,
  type DataGridTableOptions,
} from "./data-grid-features";
import { formatValue } from "./data-grid-format";
import { defaultLabels, resolveLabels, type DataGridLabels } from "./data-grid-labels";
import {
  defaultView,
  localStorageStorage,
  newViewId,
  sanitizeState,
  storageKeyFor,
  type DataGridStorage,
  type DataGridView,
  type PersistedGridState,
  type SavedView,
} from "./data-grid-persist";
import {
  DENSITY_ROW_HEIGHT,
  type DataGridCellEdit,
  type DataGridColumnMeta,
  type DataGridDensity,
  type DataGridEditorSpec,
} from "./data-grid-types";
import { humanize, useControllableState } from "./data-grid-utils";

// ── Options ───────────────────────────────────────────────────────────────────────────────────────

export interface DataGridPaginationOptions {
  /** Rows per page to start with. Default 10. */
  pageSize?: number;
  /** Choices in the "rows per page" select. Default [10, 20, 50, 100]. */
  pageSizeOptions?: readonly number[];
}

/**
 * The data is paged, sorted and filtered by a server: the grid only renders what it is given and
 * reports state changes for you to refetch. See the server-side guide.
 */
export interface DataGridServerOptions {
  /** Total rows across all pages, for the page count and the "x of y" text. */
  rowCount: number;
  pageCount?: number;
  /** Default `true`: sorting is the server's job. Set `false` to sort the current page locally. */
  sorting?: boolean;
  /** Default `true`: filtering is the server's job. */
  filtering?: boolean;
  /** Default `false`: the grid groups the current page locally. */
  grouping?: boolean;
  /** Default `false`: the grid expands locally (needs `getSubRows`). */
  expanding?: boolean;
}

export interface DataGridVirtualizeOptions {
  /** Rows rendered beyond the viewport on each side. Default 8. */
  overscan?: number;
  /** With `"auto"`, virtualize when the row model has at least this many rows. Default 200. */
  threshold?: number;
}

export interface DataGridPersistOptions {
  /** Storage key; defaults to the grid `key`. */
  key?: string;
  /** Where to keep it. Default localStorage. */
  storage?: DataGridStorage;
  /** Namespaces the key, e.g. the signed-in user's id, so two accounts on one browser don't share. */
  scope?: string | null;
  /** Default `true`: named views the user saves from the toolbar. */
  savedViews?: boolean;
}

export interface DataGridSelectionOptions<TData extends RowData> {
  /** Default `"multiple"`. */
  mode?: "multiple" | "single";
  /** Per-row switch. */
  enable?: (row: TData) => boolean;
  /** Default `true`: shift-click selects the range since the last click. */
  range?: boolean;
  /** Default `true`: selecting a parent selects its sub-rows. */
  subRows?: boolean;
}

export interface DataGridEditingOptions<TData extends RowData> {
  /** Called after any editable cell is committed (after the column's own `onEdit`). */
  onCellEdit?: (edit: DataGridCellEdit<TData, unknown>) => void | Promise<void>;
  /** Per-row switch, e.g. locked rows. */
  canEdit?: (row: TData) => boolean;
}

/**
 * Lets another source own some state (the URL, usually). Anything you provide is controlled;
 * anything you leave out, the grid keeps itself. `data-grid-url-state` builds one of these.
 */
export interface DataGridStateAdapter {
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  pageIndex?: number;
  onPageIndexChange?: (pageIndex: number) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  grouping?: GroupingState;
  onGroupingChange?: OnChangeFn<GroupingState>;
}

export interface UseDataGridOptions<TData extends RowData> {
  data: readonly TData[];
  columns: ReadonlyArray<DataGridColumnDef<TData, any>>;
  /**
   * Names this grid: the TanStack devtools label and the default persistence key. Give every grid
   * on a page its own.
   */
  key?: string;
  getRowId?: DataGridTableOptions<TData>["getRowId"];
  /** Tree data: where a row's children are. Turns expanding on. */
  getSubRows?: DataGridTableOptions<TData>["getSubRows"];
  /** Starting state for any slice, plus `density`. Persisted state, if any, wins over this. */
  initialState?: Partial<DataGridState> & { density?: DataGridDensity };
  /** `false` shows every row with no pager. */
  pagination?: false | DataGridPaginationOptions;
  server?: DataGridServerOptions;
  /**
   * Render only the rows in view. `true` always, `"auto"` (default) once the row model passes the
   * threshold, `false` never. Needs a bounded height (`height` or `fillHeight` on the grid).
   */
  virtualize?: boolean | "auto" | DataGridVirtualizeOptions;
  density?: DataGridDensity;
  defaultDensity?: DataGridDensity;
  onDensityChange?: (density: DataGridDensity) => void;
  /** Remember the user's view (columns, sort, sizes, pinning, order, grouping, density, page size). */
  persist?: boolean | string | DataGridPersistOptions;
  /** Row selection; the checkbox column comes from `col.select()`. Default on. */
  selection?: boolean | DataGridSelectionOptions<TData>;
  /** Spreadsheet-style cell focus and range selection with the keyboard and the pointer. Default on. */
  cellSelection?: boolean;
  /** Inline editing of `editable` columns. Default on when any column is editable. */
  editing?: boolean | DataGridEditingOptions<TData>;
  /** Shorthand for `editing.onCellEdit`. */
  onCellEdit?: (edit: DataGridCellEdit<TData, unknown>) => void | Promise<void>;
  /** Group-by from the column menu and the grouping bar. Default on. */
  grouping?: boolean;
  /** Pin rows to the top or bottom from the row menu. Default off. */
  rowPinning?: boolean;
  /** The search box's matcher. Default `"fuzzy"`. */
  globalFilter?: false | "fuzzy" | "includesString";
  labels?: Partial<DataGridLabels>;
  /** BCP 47 tag for number and date formatting. Defaults to the browser's. */
  locale?: string;
  /** Controlled state from elsewhere (the URL). */
  state?: DataGridStateAdapter;
  /** Any other TanStack table option, applied last. */
  table?: Partial<Omit<DataGridTableOptions<TData>, "data" | "columns" | "features">>;
}

// ── Api ───────────────────────────────────────────────────────────────────────────────────────────

export interface DataGridEditingCell {
  rowId: string;
  columnId: string;
}

export interface DataGridViewsApi {
  saved: SavedView[];
  activeId: string | null;
  /** Snapshot of the current view (what `save` would store). */
  current: () => DataGridView;
  save: (name: string) => SavedView;
  apply: (id: string) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  /** Back to the defaults (and the default view for the active id). */
  reset: () => void;
  enabled: boolean;
  savedViewsEnabled: boolean;
}

export interface DataGridExportOptions {
  /** Only the selected rows (default: every filtered, sorted row). */
  selectedOnly?: boolean;
  /** Formatted display values (default) or raw values. */
  formatted?: boolean;
  /** Only visible columns (default) or every exportable column. */
  visibleOnly?: boolean;
}

export interface DataGridEditingApi<TData extends RowData> {
  enabled: boolean;
  cell: DataGridEditingCell | null;
  error: string | null;
  start: (rowId: string, columnId: string) => void;
  cancel: () => void;
  /** Validates, calls the column's `onEdit` then the grid's `onCellEdit`; resolves to success. */
  commit: (value: unknown) => Promise<boolean>;
  isEditable: (cell: DataGridCell<TData, unknown>) => boolean;
  editorFor: (cell: DataGridCell<TData, unknown>) => DataGridEditorSpec<unknown, TData> | null;
}

export interface DataGridApi<TData extends RowData> {
  table: DataGridReactTable<TData>;
  key: string;
  labels: DataGridLabels;
  locale: string | undefined;
  density: DataGridDensity;
  setDensity: (density: DataGridDensity) => void;
  rowHeight: number;
  pagination: false | Required<DataGridPaginationOptions>;
  isServer: boolean;
  /** Resolved from `virtualize` and the current row count. */
  virtualizeRows: boolean;
  virtualizeOptions: Required<DataGridVirtualizeOptions>;
  selectionEnabled: boolean;
  cellSelectionEnabled: boolean;
  groupingEnabled: boolean;
  rowPinningEnabled: boolean;
  globalFilterEnabled: boolean;
  views: DataGridViewsApi;
  editing: DataGridEditingApi<TData>;
  exportTable: (options?: DataGridExportOptions) => ExportTable;
  exportCsv: (filename?: string, options?: DataGridExportOptions) => void;
  exportJson: (filename?: string, options?: DataGridExportOptions) => void;
  copyToClipboard: (options?: DataGridExportOptions) => Promise<boolean>;
  /** The meta the grid resolved for a column (kind inferred from data when not declared). */
  metaFor: (columnId: string) => DataGridColumnMeta;
  /** A column's title for menus and exports. */
  labelFor: (columnId: string) => string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

function inferKind(value: unknown): DataGridColumnMeta["kind"] {
  if (typeof value === "number" || typeof value === "bigint") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "datetime";
  if (Array.isArray(value)) return "tags";
  return "text";
}

const resolve = <T,>(updater: Updater<T>, old: T): T =>
  typeof updater === "function" ? (updater as (o: T) => T)(old) : updater;

// ── The hook ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Builds the table and everything the grid's parts need. Pass the result to `<DataGrid grid={…}>`,
 * or render the parts yourself inside `<DataGridRoot grid={…}>`.
 */
export function useDataGrid<TData extends RowData>(
  options: UseDataGridOptions<TData>,
): DataGridApi<TData> {
  const {
    data,
    columns,
    key = "grid",
    getRowId,
    getSubRows,
    initialState,
    pagination: paginationOption,
    server,
    virtualize = "auto",
    density: densityProp,
    defaultDensity,
    onDensityChange,
    persist,
    selection = true,
    cellSelection = true,
    editing: editingOption,
    onCellEdit,
    grouping = true,
    rowPinning = false,
    globalFilter = "fuzzy",
    labels: labelsOption,
    locale,
    state: adapter,
    table: tableOverrides,
  } = options;

  const labels = React.useMemo(() => resolveLabels(labelsOption), [labelsOption]);

  // ── Pagination ───────────────────────────────────────────────────────────────────────────────
  const pagination: false | Required<DataGridPaginationOptions> =
    paginationOption === false
      ? false
      : {
          pageSize: paginationOption?.pageSize ?? initialState?.pagination?.pageSize ?? 10,
          pageSizeOptions: paginationOption?.pageSizeOptions ?? DEFAULT_PAGE_SIZES,
        };

  // ── Persistence ──────────────────────────────────────────────────────────────────────────────
  const persistOptions: DataGridPersistOptions | null =
    persist === false || persist === undefined
      ? null
      : persist === true
        ? {}
        : typeof persist === "string"
          ? { key: persist }
          : persist;
  const storage = persistOptions?.storage ?? localStorageStorage;
  const storageKey = storageKeyFor(persistOptions?.key ?? key, persistOptions?.scope);
  const baseView = React.useMemo(
    () =>
      defaultView(
        pagination === false ? Number.MAX_SAFE_INTEGER : pagination.pageSize,
        defaultDensity ?? initialState?.density ?? "comfortable",
      ),
    // The defaults only matter at mount and on reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Read synchronously so the first render already shows the saved view (no flash of defaults).
  const [persisted, setPersisted] = React.useState<PersistedGridState>(() => {
    const empty: PersistedGridState = { v: 1, current: baseView, activeViewId: null, views: [] };
    if (!persistOptions || typeof window === "undefined") return empty;
    const raw = storage.get(storageKey);
    if (raw && !(raw instanceof Promise)) return sanitizeState(raw, baseView) ?? empty;
    return empty;
  });
  // Async storages (a server) land here after mount.
  React.useEffect(() => {
    if (!persistOptions) return;
    const raw = storage.get(storageKey);
    if (raw instanceof Promise) {
      let cancelled = false;
      void raw.then((value) => {
        if (cancelled) return;
        const next = sanitizeState(value, baseView);
        if (next) {
          setPersisted(next);
          applyView(next.current);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const startView = persisted.current;

  // ── Density ──────────────────────────────────────────────────────────────────────────────────
  const [density, setDensity] = useControllableState<DataGridDensity>(
    densityProp,
    startView.density,
    onDensityChange,
  );

  // ── Editing ──────────────────────────────────────────────────────────────────────────────────
  const editingOptions: DataGridEditingOptions<TData> | null =
    editingOption === false
      ? null
      : typeof editingOption === "object"
        ? editingOption
        : { onCellEdit };
  const [editingCell, setEditingCell] = React.useState<DataGridEditingCell | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);

  // ── Table ────────────────────────────────────────────────────────────────────────────────────
  const selectionOptions: DataGridSelectionOptions<TData> | null =
    selection === false ? null : selection === true ? {} : selection;

  const isServer = Boolean(server);
  const metaCache = React.useRef(new Map<string, DataGridColumnMeta>());
  metaCache.current.clear();

  const tableOptions: DataGridTableOptions<TData> = {
    features: dataGridFeatures,
    key,
    data,
    columns,
    getRowId,
    getSubRows,
    initialState: {
      sorting: startView.sorting,
      columnVisibility: startView.columnVisibility,
      columnPinning: startView.columnPinning,
      columnOrder: startView.columnOrder,
      columnSizing: startView.columnSizing,
      grouping: startView.grouping,
      pagination: {
        pageIndex: adapter?.pageIndex ?? initialState?.pagination?.pageIndex ?? 0,
        pageSize: pagination === false ? Number.MAX_SAFE_INTEGER : startView.pageSize,
      },
      ...stripDensity(initialState),
    },
    defaultColumn: {
      size: 160,
      minSize: 48,
      maxSize: 2000,
      // Every column without its own `cell` renders by kind (badges, numbers, dates, checkboxes…),
      // and group rows show the column's aggregate formatted the same way.
      cell: (ctx) => <DataGridDefaultCell {...ctx} />,
      aggregatedCell: (ctx) => <DataGridAggregatedCell {...ctx} />,
    },
    // sorting
    enableSorting: true,
    enableMultiSort: true,
    enableSortingRemoval: true,
    isMultiSortEvent: (e) => (e as KeyboardEvent).shiftKey,
    manualSorting: isServer ? server?.sorting !== false : false,
    // filtering
    enableFilters: true,
    enableColumnFilters: true,
    manualFiltering: isServer ? server?.filtering !== false : false,
    enableGlobalFilter: globalFilter !== false,
    globalFilterFn: globalFilter === "includesString" ? "includesString" : "fuzzy",
    getColumnCanGlobalFilter: (column) => {
      const kind = (column.columnDef.meta as DataGridColumnMeta | undefined)?.kind;
      if (kind && UTILITY_KINDS.has(kind)) return false;
      const def = column.columnDef as { enableGlobalFilter?: boolean };
      return def.enableGlobalFilter !== false && Boolean(column.accessorFn);
    },
    // pagination
    manualPagination: pagination === false || isServer,
    rowCount: server?.rowCount,
    pageCount: server?.pageCount,
    autoResetPageIndex: !isServer && pagination !== false,
    // selection
    enableRowSelection: selectionOptions
      ? selectionOptions.enable
        ? (row) => selectionOptions.enable!(row.original)
        : true
      : false,
    enableMultiRowSelection: selectionOptions?.mode !== "single",
    enableRowRangeSelection: selectionOptions?.range !== false,
    enableSubRowSelection: selectionOptions?.subRows !== false,
    isRowRangeSelectionEvent: (e) => Boolean((e as MouseEvent).shiftKey),
    // cells
    enableCellSelection: cellSelection
      ? (cell) => {
          const kind = (cell.column.columnDef.meta as DataGridColumnMeta | undefined)?.kind;
          return !(kind && UTILITY_KINDS.has(kind));
        }
      : false,
    enableCellRangeSelection: true,
    enableMultiCellRangeSelection: true,
    enableCellSelectionDrag: true,
    // columns
    enableHiding: true,
    enableColumnPinning: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    // rows
    enableRowPinning: rowPinning,
    keepPinnedRows: true,
    enableExpanding: true,
    paginateExpandedRows: false,
    autoResetExpanded: false,
    manualExpanding: isServer ? Boolean(server?.expanding) : false,
    // grouping
    enableGrouping: grouping,
    groupedColumnMode: "reorder",
    manualGrouping: isServer ? Boolean(server?.grouping) : false,
    // controlled slices from the adapter (the URL)
    ...(adapter
      ? {
          state: {
            ...(adapter.columnFilters !== undefined ? { columnFilters: adapter.columnFilters } : {}),
            ...(adapter.globalFilter !== undefined ? { globalFilter: adapter.globalFilter } : {}),
            ...(adapter.sorting !== undefined ? { sorting: adapter.sorting } : {}),
            ...(adapter.grouping !== undefined ? { grouping: adapter.grouping } : {}),
          },
          onColumnFiltersChange: adapter.onColumnFiltersChange,
          onGlobalFilterChange: adapter.onGlobalFilterChange,
          onSortingChange: adapter.onSortingChange,
          onGroupingChange: adapter.onGroupingChange,
        }
      : {}),
    ...tableOverrides,
  };

  const table = useTable(tableOptions);

  // The URL owns the page index but the view owns the page size: merge them in one controlled
  // pagination slice when an adapter provides a page index.
  const adapterPageIndex = adapter?.pageIndex;
  const onPageIndexChange = adapter?.onPageIndexChange;
  React.useEffect(() => {
    if (adapterPageIndex === undefined) return;
    const current = table.atoms.pagination.get();
    if (current.pageIndex !== adapterPageIndex) {
      table.setPageIndex(adapterPageIndex);
    }
  }, [adapterPageIndex, table]);
  React.useEffect(() => {
    if (!onPageIndexChange) return;
    let last = table.atoms.pagination.get().pageIndex;
    const sub = table.atoms.pagination.subscribe(() => {
      const next = table.atoms.pagination.get().pageIndex;
      if (next !== last) {
        last = next;
        onPageIndexChange(next);
      }
    });
    return () => sub.unsubscribe();
  }, [onPageIndexChange, table]);

  // ── Persist the view on change (debounced: resizing writes per pixel otherwise) ─────────────
  const currentView = React.useCallback((): DataGridView => {
    const s = table.store.state;
    return {
      sorting: s.sorting,
      columnVisibility: s.columnVisibility,
      columnPinning: s.columnPinning,
      columnOrder: s.columnOrder,
      columnSizing: s.columnSizing,
      grouping: s.grouping,
      pageSize: s.pagination.pageSize,
      density,
    };
  }, [table, density]);

  const persistedRef = React.useRef(persisted);
  persistedRef.current = persisted;
  const write = React.useCallback(
    (patch: Partial<PersistedGridState>) => {
      if (!persistOptions) return;
      const next: PersistedGridState = { ...persistedRef.current, ...patch };
      persistedRef.current = next;
      setPersisted(next);
      void storage.set(storageKey, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey, storage, Boolean(persistOptions)],
  );

  React.useEffect(() => {
    if (!persistOptions) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => write({ current: currentView() }), 300);
    };
    const sub = table.store.subscribe(schedule);
    schedule();
    return () => {
      sub.unsubscribe();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, currentView, write, Boolean(persistOptions)]);

  // ── Saved views ──────────────────────────────────────────────────────────────────────────────
  const applyView = React.useCallback(
    (view: DataGridView) => {
      table.setSorting(view.sorting);
      table.setColumnVisibility(view.columnVisibility);
      table.setColumnPinning(view.columnPinning);
      table.setColumnOrder(view.columnOrder);
      table.setColumnSizing(view.columnSizing);
      table.setGrouping(view.grouping);
      if (pagination !== false) table.setPageSize(view.pageSize);
      setDensity(view.density);
    },
    [table, pagination, setDensity],
  );

  const views: DataGridViewsApi = React.useMemo(
    () => ({
      saved: persisted.views,
      activeId: persisted.activeViewId,
      current: currentView,
      enabled: Boolean(persistOptions),
      savedViewsEnabled: Boolean(persistOptions) && persistOptions?.savedViews !== false,
      save: (name) => {
        const view: SavedView = {
          id: newViewId(),
          name: name.trim() || `View ${persistedRef.current.views.length + 1}`,
          view: currentView(),
          savedAt: new Date().toISOString(),
        };
        write({ views: [...persistedRef.current.views, view], activeViewId: view.id });
        return view;
      },
      apply: (id) => {
        const saved = persistedRef.current.views.find((v) => v.id === id);
        if (!saved) return;
        applyView(saved.view);
        write({ activeViewId: id, current: saved.view });
      },
      remove: (id) => {
        write({
          views: persistedRef.current.views.filter((v) => v.id !== id),
          activeViewId: persistedRef.current.activeViewId === id ? null : persistedRef.current.activeViewId,
        });
      },
      rename: (id, name) => {
        write({
          views: persistedRef.current.views.map((v) =>
            v.id === id ? { ...v, name: name.trim() || v.name } : v,
          ),
        });
      },
      reset: () => {
        applyView(baseView);
        write({ activeViewId: null, current: baseView });
      },
    }),
    [persisted, currentView, persistOptions, write, applyView, baseView],
  );

  // ── Meta + labels ────────────────────────────────────────────────────────────────────────────
  const metaFor = React.useCallback(
    (columnId: string): DataGridColumnMeta => {
      const cached = metaCache.current.get(columnId);
      if (cached) return cached;
      const column = table.getColumn(columnId);
      const declared = (column?.columnDef.meta as DataGridColumnMeta | undefined) ?? {};
      let resolved = declared;
      if (!declared.kind && column?.accessorFn) {
        const sample = table.getCoreRowModel().flatRows.find((r) => {
          const v = r.getValue(columnId);
          return v !== null && v !== undefined;
        });
        resolved = { ...declared, kind: inferKind(sample?.getValue(columnId)) };
      }
      metaCache.current.set(columnId, resolved);
      return resolved;
    },
    [table],
  );

  const labelFor = React.useCallback(
    (columnId: string): string => {
      const column = table.getColumn(columnId);
      const meta = metaFor(columnId);
      if (meta.label) return meta.label;
      const header = column?.columnDef.header;
      if (typeof header === "string" && header) return header;
      return humanize(columnId);
    },
    [table, metaFor],
  );

  // ── Editing api ──────────────────────────────────────────────────────────────────────────────
  const editorFor = React.useCallback(
    (cell: DataGridCell<TData, unknown>): DataGridEditorSpec<unknown, TData> | null => {
      if (!editingOptions) return null;
      const meta = metaFor(cell.column.id);
      if (!meta.editable) return null;
      if (editingOptions.canEdit && !editingOptions.canEdit(cell.row.original)) return null;
      const spec: DataGridEditorSpec<unknown, TData> =
        typeof meta.editable === "object" ? meta.editable : {};
      if (spec.canEdit && !spec.canEdit(cell.row.original)) return null;
      const kind = meta.kind;
      const type: DataGridEditorSpec["type"] =
        spec.type ??
        (kind === "number" || kind === "currency" || kind === "percent"
          ? "number"
          : kind === "enum"
            ? "select"
            : kind === "boolean"
              ? "checkbox"
              : kind === "date"
                ? "date"
                : kind === "datetime"
                  ? "datetime"
                  : "text");
      return { ...spec, type, options: spec.options ?? meta.options };
    },
    [editingOptions, metaFor],
  );

  const editing: DataGridEditingApi<TData> = React.useMemo(
    () => ({
      enabled: Boolean(editingOptions),
      cell: editingCell,
      error: editError,
      start: (rowId, columnId) => {
        setEditError(null);
        setEditingCell({ rowId, columnId });
      },
      cancel: () => {
        setEditError(null);
        setEditingCell(null);
      },
      commit: async (value) => {
        const target = editingCell;
        if (!target) return false;
        const row = table.getRow(target.rowId, true);
        const column = table.getColumn(target.columnId);
        if (!row || !column) {
          setEditingCell(null);
          return false;
        }
        const cell = row.getAllCellsByColumnId()[target.columnId] as
          | DataGridCell<TData, unknown>
          | undefined;
        const spec = cell ? editorFor(cell) : null;
        const previous = row.getValue(target.columnId);
        if (Object.is(previous, value)) {
          setEditingCell(null);
          return true;
        }
        const problem = spec?.validate?.(value, row.original);
        if (problem) {
          setEditError(String(problem));
          return false;
        }
        const edit: DataGridCellEdit<TData, unknown> = {
          rowId: target.rowId,
          rowIndex: row.index,
          row: row.original,
          columnId: target.columnId,
          value,
          previous,
        };
        try {
          const meta = metaFor(target.columnId);
          await meta.onEdit?.(edit);
          await editingOptions?.onCellEdit?.(edit);
          setEditError(null);
          setEditingCell(null);
          return true;
        } catch (error) {
          setEditError(error instanceof Error ? error.message : labels.invalid);
          return false;
        }
      },
      isEditable: (cell) => editorFor(cell) !== null,
      editorFor,
    }),
    [editingOptions, editingCell, editError, table, editorFor, metaFor, labels.invalid],
  );

  // ── Export ───────────────────────────────────────────────────────────────────────────────────
  const exportTable = React.useCallback(
    (opts: DataGridExportOptions = {}): ExportTable => {
      const { selectedOnly = false, formatted = true, visibleOnly = true } = opts;
      const columnsToExport = (visibleOnly ? table.getVisibleLeafColumns() : table.getAllLeafColumns())
        .filter((c) => {
          const meta = metaFor(c.id);
          if (meta.export === false) return false;
          if (meta.kind && UTILITY_KINDS.has(meta.kind)) return false;
          return Boolean(c.accessorFn) || typeof meta.export === "function";
        });
      const rows = selectedOnly
        ? table.getFilteredSelectedRowModel().rows
        : table.getPrePaginatedRowModel().rows.filter((r) => !r.getIsGrouped());
      return {
        headers: columnsToExport.map((c) => labelFor(c.id)),
        rows: rows.map((row) =>
          columnsToExport.map((c) => {
            const meta = metaFor(c.id);
            const raw = row.getValue(c.id);
            if (typeof meta.export === "function") return meta.export(raw, row.original);
            if (!formatted) return raw;
            return formatValue(raw, meta, row.original, locale, "");
          }),
        ),
      };
    },
    [table, metaFor, labelFor, locale],
  );

  const exportCsv = React.useCallback(
    (filename?: string, opts?: DataGridExportOptions) =>
      downloadFile(`${slugifyFilename(filename ?? key)}.csv`, toCsv(exportTable(opts)), "text/csv"),
    [exportTable, key],
  );
  const exportJson = React.useCallback(
    (filename?: string, opts?: DataGridExportOptions) =>
      downloadFile(
        `${slugifyFilename(filename ?? key)}.json`,
        toJson(exportTable(opts)),
        "application/json",
      ),
    [exportTable, key],
  );
  const copyToClipboard = React.useCallback(
    (opts?: DataGridExportOptions) => copyText(toTsv(exportTable(opts))),
    [exportTable],
  );

  // ── Virtualization ───────────────────────────────────────────────────────────────────────────
  const virtualizeOptions: Required<DataGridVirtualizeOptions> = {
    overscan: typeof virtualize === "object" ? (virtualize.overscan ?? 8) : 8,
    threshold: typeof virtualize === "object" ? (virtualize.threshold ?? 200) : 200,
  };
  const rowCount = table.getRowModel().rows.length;
  const virtualizeRows =
    virtualize === true ||
    ((virtualize === "auto" || typeof virtualize === "object") &&
      rowCount >= virtualizeOptions.threshold);

  return {
    table,
    key,
    labels,
    locale,
    density,
    setDensity,
    rowHeight: DENSITY_ROW_HEIGHT[density],
    pagination,
    isServer,
    virtualizeRows,
    virtualizeOptions,
    selectionEnabled: Boolean(selectionOptions),
    cellSelectionEnabled: cellSelection,
    groupingEnabled: grouping,
    rowPinningEnabled: rowPinning,
    globalFilterEnabled: globalFilter !== false,
    views,
    editing,
    exportTable,
    exportCsv,
    exportJson,
    copyToClipboard,
    metaFor,
    labelFor,
  };
}

function stripDensity(
  state: (Partial<DataGridState> & { density?: DataGridDensity }) | undefined,
): Partial<DataGridState> {
  if (!state) return {};
  const { density: _density, ...rest } = state;
  return rest;
}

export { defaultLabels };
export type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  GroupingState,
  PaginationState,
  SortingState,
};
