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
  filter: (dataValue, filterValue) => rankMatch(toText(dataValue), String(filterValue ?? "")) > 0,
  autoRemove: (filterValue) => isBlank(filterValue),
});

/**
 * A multi-select facet: the row passes when its value (or one of its values, for an array) is one
 * of the chosen values. Compared as strings so values round-trip through URLs and storage.
 */
const matchFacet = (dataValue: unknown, filterValue: unknown): boolean => {
  const chosen = Array.isArray(filterValue) ? filterValue : [filterValue];
  if (chosen.length === 0) return true;
  const set = new Set(chosen.map((c) => String(c)));
  if (Array.isArray(dataValue)) return dataValue.some((v) => set.has(String(v)));
  return set.has(String(dataValue));
};
export const filterFn_facet = constructFilterFn({
  filter: matchFacet,
  autoRemove: (filterValue) => isBlank(filterValue),
});

/** `{ op, value }` text matching, case-insensitive. */
const matchText = (
  dataValue: unknown,
  filterValue: DataGridTextFilterValue | string | undefined,
): boolean => {
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
};
const textIsBlank = (filterValue: DataGridTextFilterValue | string | undefined): boolean => {
  if (typeof filterValue === "string") return filterValue === "";
  if (!filterValue) return true;
  if (filterValue.op === "isEmpty" || filterValue.op === "isNotEmpty") return false;
  return filterValue.value === "";
};
export const filterFn_textOp = constructFilterFn({ filter: matchText, autoRemove: textIsBlank });

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** `{ min?, max? }`, inclusive; an open end is unbounded. */
const matchRange = (
  dataValue: unknown,
  filterValue: DataGridRangeFilterValue | undefined,
): boolean => {
  const n = toNumber(dataValue);
  if (n === null) return false;
  const min = toNumber(filterValue?.min);
  const max = toNumber(filterValue?.max);
  if (min !== null && n < min) return false;
  if (max !== null && n > max) return false;
  return true;
};
const rangeIsBlank = (filterValue: DataGridRangeFilterValue | undefined): boolean =>
  !filterValue || (toNumber(filterValue.min) === null && toNumber(filterValue.max) === null);
export const filterFn_range = constructFilterFn({ filter: matchRange, autoRemove: rangeIsBlank });

const toTime = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v as string | number);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
};

/** `{ from?, to? }` ISO dates, inclusive by calendar day on the `to` end. */
const matchDateRange = (
  dataValue: unknown,
  filterValue: DataGridDateRangeFilterValue | undefined,
): boolean => {
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
};
const dateRangeIsBlank = (filterValue: DataGridDateRangeFilterValue | undefined): boolean =>
  !filterValue || (toTime(filterValue.from) === null && toTime(filterValue.to) === null);
export const filterFn_dateRange = constructFilterFn({
  filter: matchDateRange,
  autoRemove: dateRangeIsBlank,
});

/** `true`/`false`; anything else removes the filter. */
const matchBoolean = (dataValue: unknown, filterValue: unknown): boolean =>
  Boolean(dataValue) === Boolean(filterValue);
export const filterFn_boolean = constructFilterFn({
  filter: matchBoolean,
  autoRemove: (filterValue) => typeof filterValue !== "boolean",
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Picks the grid's filter by the shape of the value: an array is a facet, a boolean a boolean,
 * `{ op }` a text match, `{ min, max }` a range, `{ from, to }` a date range, a string "contains".
 * The default for columns that come as plain TanStack definitions, whose kind the grid infers
 * from the data: the filter UI the header shows and the function that runs then agree.
 */
export const filterFn_byValue = constructFilterFn({
  filter: (dataValue, filterValue: unknown) => {
    if (Array.isArray(filterValue)) return matchFacet(dataValue, filterValue);
    if (typeof filterValue === "boolean") return matchBoolean(dataValue, filterValue);
    if (isRecord(filterValue)) {
      if ("op" in filterValue)
        return matchText(dataValue, filterValue as unknown as DataGridTextFilterValue);
      if ("min" in filterValue || "max" in filterValue)
        return matchRange(dataValue, filterValue as DataGridRangeFilterValue);
      if ("from" in filterValue || "to" in filterValue)
        return matchDateRange(dataValue, filterValue as DataGridDateRangeFilterValue);
    }
    return matchText(dataValue, filterValue as string | undefined);
  },
  autoRemove: (filterValue: unknown) => {
    if (Array.isArray(filterValue)) return filterValue.length === 0;
    if (typeof filterValue === "boolean") return false;
    if (isRecord(filterValue)) {
      if ("op" in filterValue)
        return textIsBlank(filterValue as unknown as DataGridTextFilterValue);
      if ("min" in filterValue || "max" in filterValue)
        return rangeIsBlank(filterValue as DataGridRangeFilterValue);
      if ("from" in filterValue || "to" in filterValue)
        return dateRangeIsBlank(filterValue as DataGridDateRangeFilterValue);
    }
    return isBlank(filterValue);
  },
});

// ── The features preset ───────────────────────────────────────────────────────────────────────────

/**
 * Every TanStack Table v9 feature the grid uses, its row models, and the named functions columns
 * may refer to by string. Registered once here, so each grid bundles exactly this and the type of
 * `columnDef.meta` is {@link DataGridColumnMeta} on every column, with no declaration merging.
 *
 * Need a feature the grid does not use (cell spanning, say)? This file is yours: add it to the
 * object below and every grid, and every type in this folder, picks it up.
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
    byValue: filterFn_byValue,
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
