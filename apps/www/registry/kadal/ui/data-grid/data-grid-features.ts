import {
  aggregationFn_count,
  aggregationFn_extent,
  aggregationFn_first,
  aggregationFn_last,
  aggregationFn_max,
  aggregationFn_mean,
  aggregationFn_median,
  aggregationFn_min,
  aggregationFn_sum,
  aggregationFn_unique,
  aggregationFn_uniqueCount,
  cellSelectionFeature,
  columnFacetingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  constructFilterFn,
  createExpandedRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equals,
  filterFn_includesString,
  filterFn_weakEquals,
  globalFilteringFeature,
  metaHelper,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
  type Cell,
  type CellContext,
  type Column,
  type ColumnDef,
  type Header,
  type HeaderContext,
  type ReactTable,
  type Row,
  type RowData,
  type Table,
  type TableOptions,
  type TableState,
} from "@tanstack/react-table";

import type {
  DataGridColumnMeta,
  DataGridDateRangeFilterValue,
  DataGridRangeFilterValue,
  DataGridTextFilterValue,
} from "./data-grid-types";

// ── Ranking for the global search ─────────────────────────────────────────────────────────────────

/**
 * Scores how well `text` matches `query`: exact 6, prefix 5, word prefix 4, contains 3, acronym 2,
 * subsequence 1, no match 0. Dependency-free on purpose: good enough to rank rows and cheap enough
 * to run on every keystroke over tens of thousands of cells.
 */
export function rankMatch(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 6;
  if (t.startsWith(q)) return 5;
  const idx = t.indexOf(q);
  if (idx > 0 && /[\s_\-./(]/.test(t[idx - 1] ?? "")) return 4;
  if (idx >= 0) return 3;
  const acronym = t
    .split(/[\s_\-./]+/)
    .map((w) => w[0] ?? "")
    .join("");
  if (acronym.startsWith(q)) return 2;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  return qi === q.length ? 1 : 0;
}

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toText).join(" ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// ── Filter functions ──────────────────────────────────────────────────────────────────────────────

const isBlank = (v: unknown) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Fuzzy, rank-based matching for the global search box. */
export const filterFn_fuzzy = constructFilterFn({
  filter: (dataValue, filterValue) =>
    rankMatch(toText(dataValue), String(filterValue ?? "")) > 0,
  autoRemove: (filterValue) => isBlank(filterValue),
});

/**
 * A multi-select facet: the row passes when its value (or one of its values, for an array) is one
 * of the chosen values. Compared as strings so values round-trip through URLs and storage.
 */
export const filterFn_facet = constructFilterFn({
  filter: (dataValue, filterValue: unknown) => {
    const chosen = Array.isArray(filterValue) ? filterValue : [filterValue];
    if (chosen.length === 0) return true;
    const set = new Set(chosen.map((c) => String(c)));
    if (Array.isArray(dataValue)) return dataValue.some((v) => set.has(String(v)));
    return set.has(String(dataValue));
  },
  autoRemove: (filterValue) => isBlank(filterValue),
});

/** `{ op, value }` text matching, case-insensitive. */
export const filterFn_textOp = constructFilterFn({
  filter: (dataValue, filterValue: DataGridTextFilterValue | string | undefined) => {
    const spec: DataGridTextFilterValue =
      typeof filterValue === "string"
        ? { op: "contains", value: filterValue }
        : (filterValue ?? { op: "contains", value: "" });
    const haystack = toText(dataValue).toLowerCase();
    const needle = (spec.value ?? "").toLowerCase();
    switch (spec.op) {
      case "isEmpty":
        return isBlank(dataValue);
      case "isNotEmpty":
        return !isBlank(dataValue);
      case "equals":
        return haystack === needle;
      case "startsWith":
        return haystack.startsWith(needle);
      case "endsWith":
        return haystack.endsWith(needle);
      case "notContains":
        return !haystack.includes(needle);
      case "contains":
      default:
        return haystack.includes(needle);
    }
  },
  autoRemove: (filterValue: DataGridTextFilterValue | string | undefined) => {
    if (typeof filterValue === "string") return filterValue === "";
    if (!filterValue) return true;
    if (filterValue.op === "isEmpty" || filterValue.op === "isNotEmpty") return false;
    return filterValue.value === "";
  },
});

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** `{ min?, max? }`, inclusive; an open end is unbounded. */
export const filterFn_range = constructFilterFn({
  filter: (dataValue, filterValue: DataGridRangeFilterValue | undefined) => {
    const n = toNumber(dataValue);
    if (n === null) return false;
    const min = toNumber(filterValue?.min);
    const max = toNumber(filterValue?.max);
    if (min !== null && n < min) return false;
    if (max !== null && n > max) return false;
    return true;
  },
  autoRemove: (filterValue: DataGridRangeFilterValue | undefined) =>
    !filterValue || (toNumber(filterValue.min) === null && toNumber(filterValue.max) === null),
});

const toTime = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
};

/** `{ from?, to? }` ISO dates, inclusive by calendar day on the `to` end. */
export const filterFn_dateRange = constructFilterFn({
  filter: (dataValue, filterValue: DataGridDateRangeFilterValue | undefined) => {
    const t = toTime(dataValue);
    if (t === null) return false;
    const from = toTime(filterValue?.from);
    let to = toTime(filterValue?.to);
    if (to !== null && typeof filterValue?.to === "string" && filterValue.to.length <= 10) {
      // A bare date means "through the end of that day".
      to += 24 * 60 * 60 * 1000 - 1;
    }
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    return true;
  },
  autoRemove: (filterValue: DataGridDateRangeFilterValue | undefined) =>
    !filterValue || (toTime(filterValue.from) === null && toTime(filterValue.to) === null),
});

/** `true`/`false`; anything else removes the filter. */
export const filterFn_boolean = constructFilterFn({
  filter: (dataValue, filterValue: unknown) => Boolean(dataValue) === Boolean(filterValue),
  autoRemove: (filterValue) => typeof filterValue !== "boolean",
});

// ── The features preset ───────────────────────────────────────────────────────────────────────────

/**
 * Every TanStack Table v9 feature the grid uses, its row models, and the named functions columns
 * may refer to by string. Registered once here, so each grid bundles exactly this and the type of
 * `columnDef.meta` is {@link DataGridColumnMeta} on every column, with no declaration merging.
 *
 * Need a feature the grid does not use (cell spanning, say)? Compose your own with
 * `tableFeatures({ ...dataGridFeatures, cellSpanningFeature })` and pass it as `features`.
 */
export const dataGridFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnFacetingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnPinningFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowExpandingFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  rowPinningFeature,
  cellSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    text: sortFn_text,
    textCaseSensitive: sortFn_textCaseSensitive,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  filterFns: {
    includesString: filterFn_includesString,
    equals: filterFn_equals,
    weakEquals: filterFn_weakEquals,
    fuzzy: filterFn_fuzzy,
    facet: filterFn_facet,
    text: filterFn_textOp,
    range: filterFn_range,
    dateRange: filterFn_dateRange,
    boolean: filterFn_boolean,
  },
  aggregationFns: {
    sum: aggregationFn_sum,
    min: aggregationFn_min,
    max: aggregationFn_max,
    extent: aggregationFn_extent,
    mean: aggregationFn_mean,
    median: aggregationFn_median,
    unique: aggregationFn_unique,
    uniqueCount: aggregationFn_uniqueCount,
    count: aggregationFn_count,
    first: aggregationFn_first,
    last: aggregationFn_last,
  },
  columnMeta: metaHelper<DataGridColumnMeta>(),
});

export type DataGridFeatures = typeof dataGridFeatures;

/** The names a column's `aggregationFn` may use. */
export type DataGridAggregation = keyof DataGridFeatures["aggregationFns"];

// ── Type aliases, pre-bound to the grid's features ────────────────────────────────────────────────
// Reach for these instead of TanStack's generics with `DataGridFeatures` spelled out every time.

export type DataGridTableInstance<TData extends RowData> = Table<DataGridFeatures, TData>;
export type DataGridReactTable<TData extends RowData> = ReactTable<DataGridFeatures, TData>;
export type DataGridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridRow<TData extends RowData> = Row<DataGridFeatures, TData>;
export type DataGridCell<TData extends RowData, TValue = unknown> = Cell<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridColumn<TData extends RowData, TValue = unknown> = Column<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridHeader<TData extends RowData, TValue = unknown> = Header<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridCellContext<TData extends RowData, TValue = unknown> = CellContext<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridHeaderContext<TData extends RowData, TValue = unknown> = HeaderContext<
  DataGridFeatures,
  TData,
  TValue
>;
export type DataGridState = TableState<DataGridFeatures>;
export type DataGridTableOptions<TData extends RowData> = TableOptions<DataGridFeatures, TData>;
