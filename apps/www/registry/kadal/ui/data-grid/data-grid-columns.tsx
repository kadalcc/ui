import * as React from "react";
import {
  createColumnHelper,
  type AccessorFn,
  type AccessorFnColumnDef,
  type AccessorKeyColumnDef,
  type ColumnDef,
  type DeepKeys,
  type DeepValue,
  type DisplayColumnDef,
  type GroupColumnDef,
  type IdentifiedColumnDef,
  type RowData,
} from "@tanstack/react-table";

import {
  type DataGridAggregation,
  type DataGridCellContext,
  type DataGridColumnDef,
  type DataGridFeatures,
  type DataGridHeaderContext,
} from "./data-grid-features";
import type {
  DataGridCellEdit,
  DataGridColumnKind,
  DataGridColumnMeta,
  DataGridEditorSpec,
  DataGridFilterKind,
  DataGridOption,
} from "./data-grid-types";

export const ROW_ACTIONS_COLUMN_ID = "actions";
export const SELECT_COLUMN_ID = "select";
export const EXPANDER_COLUMN_ID = "expander";
export const ROW_NUMBER_COLUMN_ID = "#";

/** Columns the grid renders itself (checkbox, chevron, menu) and never sorts, filters or exports. */
export const UTILITY_KINDS: ReadonlySet<DataGridColumnKind> = new Set([
  "select",
  "expander",
  "rowNumber",
  "actions",
]);

/**
 * The options every typed column accepts: any TanStack column option, plus the grid's own, lifted
 * out of `meta` so a column reads as one flat object. `TValue` is the column's inferred value type,
 * so `format`, `validate` and `onEdit` are typed against the real field.
 */
export type DataGridColumnOptions<TData extends RowData, TValue> = Omit<
  IdentifiedColumnDef<DataGridFeatures, TData, TValue>,
  "meta" | "header"
> & {
  /** A string renders the sortable header with the column menu; a function renders as you say. */
  header?: string | ((ctx: DataGridHeaderContext<TData, TValue>) => React.ReactNode);
  label?: string;
  description?: string;
  align?: DataGridColumnMeta["align"];
  filter?: DataGridFilterKind | false;
  editable?: boolean | DataGridEditorSpec<TValue, TData>;
  onEdit?: (edit: DataGridCellEdit<TData, TValue>) => void | Promise<void>;
  format?: (value: TValue, row: TData) => string;
  options?: readonly DataGridOption<TValue extends readonly (infer U)[] ? U : TValue>[];
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  href?: (value: TValue, row: TData) => string;
  target?: React.HTMLAttributeAnchorTarget;
  export?: boolean | ((value: TValue, row: TData) => unknown);
  truncate?: boolean;
  wrap?: boolean;
  mono?: boolean;
  headerClassName?: string;
  cellClassName?: string | ((value: TValue, row: TData) => string | undefined);
  tooltip?: boolean | ((value: TValue, row: TData) => React.ReactNode);
  groupable?: boolean;
  draggable?: boolean;
  stable?: boolean;
  /** Any other `meta` of your own; merged last. */
  meta?: Partial<DataGridColumnMeta> & Record<string, unknown>;
};

const META_KEYS = [
  "label",
  "description",
  "align",
  "filter",
  "editable",
  "onEdit",
  "format",
  "options",
  "currency",
  "locale",
  "minimumFractionDigits",
  "maximumFractionDigits",
  "dateStyle",
  "timeStyle",
  "href",
  "target",
  "export",
  "truncate",
  "wrap",
  "mono",
  "headerClassName",
  "cellClassName",
  "tooltip",
  "groupable",
  "draggable",
  "stable",
] as const;

/** Splits the flat options into TanStack's column def and the grid's `meta`. */
export function splitColumnOptions<TData extends RowData, TValue>(
  kind: DataGridColumnKind,
  options: DataGridColumnOptions<TData, TValue> | undefined,
): { def: Record<string, unknown>; meta: DataGridColumnMeta } {
  const def: Record<string, unknown> = {};
  const meta: DataGridColumnMeta = { kind, ...(options?.meta as DataGridColumnMeta | undefined) };
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (key === "meta") continue;
      if ((META_KEYS as readonly string[]).includes(key)) {
        if (value !== undefined) (meta as Record<string, unknown>)[key] = value;
      } else {
        def[key] = value;
      }
    }
  }
  return { def, meta };
}

/** Sort/filter/aggregation defaults by kind: what a column of this kind should do unless told. */
export function kindDefaults(kind: DataGridColumnKind): Partial<DataGridColumnDef<any, any>> & {
  meta: DataGridColumnMeta;
} {
  switch (kind) {
    case "number":
    case "currency":
    case "percent":
      return {
        sortFn: "basic",
        filterFn: "range",
        aggregationFn: kind === "percent" ? "mean" : "sum",
        meta: { kind, align: "end", filter: "range" },
      };
    case "date":
    case "datetime":
      return {
        sortFn: "datetime",
        filterFn: "dateRange",
        aggregationFn: "extent",
        meta: { kind, filter: "dateRange" },
      };
    case "boolean":
      return {
        sortFn: "basic",
        filterFn: "boolean",
        aggregationFn: "count",
        meta: { kind, filter: "boolean", align: "center" },
      };
    case "enum":
      return {
        sortFn: "alphanumeric",
        filterFn: "facet",
        aggregationFn: "uniqueCount",
        meta: { kind, filter: "facet" },
      };
    case "tags":
      return {
        sortFn: "alphanumeric",
        filterFn: "facet",
        aggregationFn: "uniqueCount",
        // Each tag becomes its own facet value instead of the array as one opaque value.
        getUniqueValues: (row: unknown, _index: number) => [] as unknown[],
        meta: { kind, filter: "facet", groupable: false },
      };
    case "link":
    case "text":
      return {
        sortFn: "alphanumeric",
        filterFn: "text",
        aggregationFn: "uniqueCount",
        meta: { kind, filter: "text" },
      };
    case "select":
    case "expander":
    case "rowNumber":
    case "actions":
      return {
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        enableGlobalFilter: false,
        enableColumnFilter: false,
        enableGrouping: false,
        enablePinning: true,
        // Arrow keys step over these: a focus ring on a checkbox cell helps nobody.
        enableCellSelection: false,
        meta: { kind, filter: false, export: false, groupable: false, stable: true },
      };
    default:
      return { meta: { kind } };
  }
}

type AccessorValue<TData extends RowData, TAccessor> =
  TAccessor extends AccessorFn<TData, infer TReturn>
    ? TReturn
    : TAccessor extends DeepKeys<TData>
      ? DeepValue<TData, TAccessor>
      : never;

type AccessorResult<TData extends RowData, TAccessor, TValue> =
  TAccessor extends AccessorFn<TData>
    ? AccessorFnColumnDef<DataGridFeatures, TData, TValue>
    : AccessorKeyColumnDef<DataGridFeatures, TData, TValue>;

type AccessorOptions<TData extends RowData, TAccessor, TValue> =
  TAccessor extends AccessorFn<TData>
    ? DataGridColumnOptions<TData, TValue> & { id: string }
    : DataGridColumnOptions<TData, TValue>;

/**
 * A typed column builder for one row type. Keys are checked against `TData` (nested paths too),
 * value types flow into `format`, `options`, `validate` and `onEdit`, and each kind brings the
 * right defaults, so most columns are one line:
 *
 * ```ts
 * const col = createDataGridColumns<Order>()
 * const columns = col.columns([
 *   col.select(),
 *   col.text("customer", { header: "Customer" }),
 *   col.currency("total", { currency: "EUR", editable: true }),
 *   col.enum("status", { options: STATUS_OPTIONS }),
 *   col.date("placedAt"),
 *   col.actions(({ row }) => <OrderMenu order={row.original} />),
 * ])
 * ```
 */
export function createDataGridColumns<TData extends RowData>() {
  const helper = createColumnHelper<DataGridFeatures, TData>();

  const make =
    (kind: DataGridColumnKind) =>
    <TAccessor extends AccessorFn<TData> | DeepKeys<TData>>(
      accessor: TAccessor,
      options?: AccessorOptions<TData, TAccessor, AccessorValue<TData, TAccessor>>,
    ): AccessorResult<TData, TAccessor, AccessorValue<TData, TAccessor>> => {
      const { def, meta } = splitColumnOptions(kind, options);
      const defaults = kindDefaults(kind);
      const { meta: defaultMeta, ...defaultDef } = defaults;
      const merged = {
        ...defaultDef,
        ...def,
        meta: { ...defaultMeta, ...meta },
      } as Record<string, unknown>;
      // `filter` names the UI; unless told otherwise, the function that runs is the matching one,
      // so `col.text("team", { filter: "facet" })` filters by the chosen values.
      if (meta.filter !== undefined && def.filterFn === undefined) {
        if (meta.filter === false) merged.enableColumnFilter = false;
        else merged.filterFn = meta.filter;
      }
      if (kind === "tags") {
        // The array's items are the facet values.
        merged.getUniqueValues = (row: TData, index: number) => {
          const fn = typeof accessor === "function" ? (accessor as AccessorFn<TData>) : null;
          const value = fn
            ? fn(row, index)
            : String(accessor)
                .split(".")
                .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], row);
          return Array.isArray(value)
            ? value
            : value === undefined || value === null
              ? []
              : [value];
        };
      }
      // `helper.accessor` is typed over the exact accessor shape; the cast keeps the overload.
      return helper.accessor(accessor as never, merged as never) as never;
    };

  const text = make("text");
  const number = make("number");
  const currency = make("currency");
  const percent = make("percent");
  const date = make("date");
  const datetime = make("datetime");
  const boolean = make("boolean");
  const enumeration = make("enum");
  const tags = make("tags");
  const link = make("link");
  const custom = make("custom");

  /** A display column with no accessor (an avatar, a sparkline, …). */
  const display = (
    options: Omit<DataGridColumnOptions<TData, unknown>, "id" | "accessorKey"> & { id: string },
  ): DisplayColumnDef<DataGridFeatures, TData, unknown> => {
    const { def, meta } = splitColumnOptions("custom", options);
    return helper.display({ ...def, meta } as never);
  };

  /** A header spanning several columns. Takes typed builder columns as they are. */
  const group = (
    header: string,
    columns: ReadonlyArray<ColumnDef<DataGridFeatures, TData, any>>,
    options?: Omit<GroupColumnDef<DataGridFeatures, TData, unknown>, "columns" | "header">,
  ): GroupColumnDef<DataGridFeatures, TData, unknown> =>
    helper.group({ id: options?.id ?? header, header, columns, ...options } as never);

  /** Preserves each column's own value type across the array (TanStack's `columns` helper). */
  const columns = helper.columns;

  /** The row-selection checkbox column. Rendered by the grid; just place it first. */
  const select = (
    options?: Partial<DisplayColumnDef<DataGridFeatures, TData, unknown>>,
  ): DisplayColumnDef<DataGridFeatures, TData, unknown> => {
    const { meta, ...def } = kindDefaults("select");
    return helper.display({
      id: SELECT_COLUMN_ID,
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: "",
      ...def,
      ...options,
      meta: { ...meta, ...(options?.meta as DataGridColumnMeta | undefined) },
    } as never);
  };

  /** The expand/collapse chevron column for tree data. Rendered by the grid. */
  const expander = (
    options?: Partial<DisplayColumnDef<DataGridFeatures, TData, unknown>>,
  ): DisplayColumnDef<DataGridFeatures, TData, unknown> => {
    const { meta, ...def } = kindDefaults("expander");
    return helper.display({
      id: EXPANDER_COLUMN_ID,
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: "",
      ...def,
      ...options,
      meta: { ...meta, ...(options?.meta as DataGridColumnMeta | undefined) },
    } as never);
  };

  /** A 1-based row number that follows sorting and filtering. */
  const rowNumber = (
    options?: Partial<DisplayColumnDef<DataGridFeatures, TData, unknown>>,
  ): DisplayColumnDef<DataGridFeatures, TData, unknown> => {
    const { meta, ...def } = kindDefaults("rowNumber");
    return helper.display({
      id: ROW_NUMBER_COLUMN_ID,
      size: 56,
      minSize: 48,
      header: "#",
      ...def,
      ...options,
      meta: {
        ...meta,
        align: "end",
        mono: true,
        ...(options?.meta as DataGridColumnMeta | undefined),
      },
    } as never);
  };

  /**
   * The row-actions column, usually a `⋯` menu. It sits outside the drag-to-reorder machinery so a
   * menu anchored in it opens and positions reliably. Render it as the last column.
   */
  const actions = (
    cell: (ctx: DataGridCellContext<TData, unknown>) => React.ReactNode,
    options?: Partial<DisplayColumnDef<DataGridFeatures, TData, unknown>>,
  ): DisplayColumnDef<DataGridFeatures, TData, unknown> => {
    const { meta, ...def } = kindDefaults("actions");
    return helper.display({
      id: ROW_ACTIONS_COLUMN_ID,
      size: 56,
      minSize: 48,
      header: "",
      cell,
      ...def,
      ...options,
      meta: { ...meta, align: "end", ...(options?.meta as DataGridColumnMeta | undefined) },
    } as never);
  };

  return {
    text,
    number,
    currency,
    percent,
    date,
    datetime,
    boolean,
    enum: enumeration,
    tags,
    link,
    custom,
    display,
    group,
    columns,
    select,
    expander,
    rowNumber,
    actions,
    /** The raw TanStack column helper, for anything above does not cover. */
    helper,
  };
}

export type DataGridColumnBuilder<TData extends RowData> = ReturnType<
  typeof createDataGridColumns<TData>
>;

/** The aggregation a `number`-like column uses when grouped, unless the column says otherwise. */
export const DEFAULT_AGGREGATION: Partial<Record<DataGridColumnKind, DataGridAggregation>> = {
  number: "sum",
  currency: "sum",
  percent: "mean",
  date: "extent",
  datetime: "extent",
  boolean: "count",
  enum: "uniqueCount",
  text: "uniqueCount",
  link: "uniqueCount",
  tags: "uniqueCount",
};
