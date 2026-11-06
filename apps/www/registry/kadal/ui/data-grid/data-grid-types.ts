import type * as React from "react";
import type { RowData } from "@tanstack/react-table";

/** Row height presets. The value becomes `--dg-row-height` on the grid root. */
export type DataGridDensity = "compact" | "comfortable" | "spacious";

export const DENSITY_ROW_HEIGHT: Record<DataGridDensity, number> = {
  compact: 32,
  comfortable: 40,
  spacious: 48,
};

/**
 * What a column holds. The kind picks the default cell renderer, filter UI, editor, sort function,
 * aggregation and export formatting, so a column definition usually needs nothing else.
 */
export type DataGridColumnKind =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "tags"
  | "link"
  | "select"
  | "expander"
  | "rowNumber"
  | "actions"
  | "custom";

/** Which filter UI a column header offers. `false` removes the filter section from its menu. */
export type DataGridFilterKind = "facet" | "text" | "range" | "dateRange" | "boolean";

export type DataGridTextFilterOp =
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "equals"
  | "isEmpty"
  | "isNotEmpty";

export interface DataGridTextFilterValue {
  op: DataGridTextFilterOp;
  value: string;
}

export interface DataGridRangeFilterValue {
  min?: number | null;
  max?: number | null;
}

export interface DataGridDateRangeFilterValue {
  /** ISO date strings (yyyy-mm-dd or full ISO). */
  from?: string | null;
  to?: string | null;
}

/** One choice of an `enum`/`tags` column, and what a facet filter and the select editor show. */
export interface DataGridOption<TValue = unknown> {
  value: TValue;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Extra classes on the badge the cell renders (a status colour, say). */
  className?: string;
}

export type DataGridEditorType =
  | "text"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "datetime"
  | "textarea";

/** Configures the inline editor a cell opens on Enter, F2 or double-click. */
export interface DataGridEditorSpec<TValue = unknown, TData extends RowData = RowData> {
  /** Defaults from the column kind: text → text, number/currency/percent → number, enum → select, boolean → checkbox, date → date. */
  type?: DataGridEditorType;
  options?: readonly DataGridOption<TValue>[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Return a message to reject the value; nothing to accept it. */
  validate?: (value: TValue, row: TData) => string | null | undefined | void;
  /** Turns the editor's string into the column's value. Defaults by type (Number(), Date, …). */
  parse?: (raw: string, row: TData) => TValue;
  /** Per-row switch, e.g. only drafts are editable. */
  canEdit?: (row: TData) => boolean;
}

export interface DataGridCellEdit<TData extends RowData = RowData, TValue = unknown> {
  rowId: string;
  rowIndex: number;
  row: TData;
  columnId: string;
  value: TValue;
  previous: TValue;
}

/**
 * Per-column settings the grid reads from `columnDef.meta`. Declared through the `columnMeta`
 * slot of `dataGridFeatures`, so every `meta` in a data-grid column is typed without any global
 * declaration merging — the column builder fills most of it in for you.
 */
export interface DataGridColumnMeta {
  kind?: DataGridColumnKind;
  /** Title in menus, chips and exports. Defaults to the header string or a humanised id. */
  label?: string;
  description?: string;
  align?: "start" | "center" | "end";
  filter?: DataGridFilterKind | false;
  editable?: boolean | DataGridEditorSpec<any, any>;
  /** Called after a cell in this column was edited, before the grid-level `onCellEdit`. */
  onEdit?: (edit: DataGridCellEdit<any, any>) => void | Promise<void>;
  /** Formats the raw value for display and export. */
  format?: (value: any, row: any) => string;
  options?: readonly DataGridOption<any>[];
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  /** The href for a `link` column. */
  href?: (value: any, row: any) => string;
  target?: React.HTMLAttributeAnchorTarget;
  /**
   * Render the column outside the drag-to-reorder machinery. Required for a cell that anchors a
   * menu or popover (row actions): a reordering column carries a CSS transform and re-registers
   * with the sensor as the grid changes, which gives a popup an unstable anchor.
   */
  stable?: boolean;
  /** Include in exports. `false` skips it; a function supplies the exported value. */
  export?: boolean | ((value: any, row: any) => unknown);
  /** Ellipsis instead of wrapping (default) — or `wrap: true` to let long text wrap. */
  truncate?: boolean;
  wrap?: boolean;
  mono?: boolean;
  headerClassName?: string;
  cellClassName?: string | ((value: any, row: any) => string | undefined);
  /** Show the full value in a tooltip on hover (useful with `truncate`). */
  tooltip?: boolean | ((value: any, row: any) => React.ReactNode);
  /** `false` keeps the column out of the "group by" menu. */
  groupable?: boolean;
  /** `false` hides the drag handle (the column still moves when others are reordered). */
  draggable?: boolean;
}
