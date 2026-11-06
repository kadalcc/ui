import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, MinusIcon, XIcon } from "lucide-react";

import { Badge } from "@/registry/kadal/ui/badge";
import { Button } from "@/registry/kadal/ui/button";
import { Checkbox } from "@/registry/kadal/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kadal/ui/tooltip";

import { useDataGridContext } from "./data-grid-context";
import type { DataGridCellContext, DataGridHeaderContext } from "./data-grid-features";
import { formatValue } from "./data-grid-format";
import type { DataGridColumnMeta } from "./data-grid-types";

/** Text alignment classes for a column's `align`. */
export const alignClass = (align: DataGridColumnMeta["align"]) =>
  align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start";

/**
 * The cell every column gets unless it brings its own `cell`: renders the value by the column's
 * kind (enum badges, formatted numbers, dates, booleans, links, tags) with the grid's locale.
 */
export function DataGridDefaultCell<TData extends RowData, TValue>(
  ctx: DataGridCellContext<TData, TValue>,
) {
  const grid = useDataGridContext<TData>();
  const meta = grid.metaFor(ctx.column.id);
  const value = ctx.getValue();
  const row = ctx.row.original;

  switch (meta.kind) {
    case "select":
      return <DataGridSelectCell {...(ctx as unknown as DataGridCellContext<TData, unknown>)} />;
    case "expander":
      return <DataGridExpanderCell {...(ctx as unknown as DataGridCellContext<TData, unknown>)} />;
    case "rowNumber":
      return (
        <span className="tabular-nums text-muted-foreground">{ctx.row.getDisplayIndex() + 1}</span>
      );
    case "boolean":
      return (
        <span
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full",
            value ? "bg-primary/10 text-primary" : "text-muted-foreground/60",
          )}
          aria-label={value ? grid.labels.yes : grid.labels.no}
        >
          {value ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
        </span>
      );
    case "enum": {
      const option = meta.options?.find((o) => String(o.value) === String(value));
      if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground">{grid.labels.blank}</span>;
      }
      const Icon = option?.icon;
      return (
        <Badge variant="secondary" className={cn("font-normal", option?.className)}>
          {Icon ? <Icon className="size-3" /> : null}
          {option?.label ?? String(value)}
        </Badge>
      );
    }
    case "tags": {
      const items = Array.isArray(value) ? value : value == null ? [] : [value];
      if (items.length === 0) {
        return <span className="text-muted-foreground">{grid.labels.blank}</span>;
      }
      const shown = items.slice(0, 3);
      const more = items.length - shown.length;
      return (
        <span className="flex items-center gap-1">
          {shown.map((item, i) => {
            const option = meta.options?.find((o) => String(o.value) === String(item));
            return (
              <Badge key={i} variant="outline" className={cn("font-normal", option?.className)}>
                {option?.label ?? String(item)}
              </Badge>
            );
          })}
          {more > 0 ? (
            <Tooltip>
              <TooltipTrigger render={<Badge variant="ghost" className="font-normal" />}>
                +{more}
              </TooltipTrigger>
              <TooltipContent>
                {items
                  .slice(3)
                  .map(
                    (item) =>
                      meta.options?.find((o) => String(o.value) === String(item))?.label ??
                      String(item),
                  )
                  .join(", ")}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
      );
    }
    case "link": {
      const text = formatValue(value, meta, row, grid.locale, grid.labels.blank, grid.labels);
      if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground">{text}</span>;
      }
      const href = meta.href ? meta.href(value, row) : String(value);
      return (
        <a
          href={href}
          target={meta.target ?? "_blank"}
          rel="noreferrer"
          className="inline-block max-w-full truncate align-bottom text-primary underline-offset-4 hover:underline"
          title={text}
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </a>
      );
    }
    default: {
      const text = formatValue(value, meta, row, grid.locale, grid.labels.blank, grid.labels);
      const blank = value === null || value === undefined || value === "";
      const content = (
        <span
          className={cn(
            blank && "text-muted-foreground",
            meta.mono && "font-mono text-[0.92em]",
            (meta.kind === "number" || meta.kind === "currency" || meta.kind === "percent") &&
              "tabular-nums",
            meta.truncate !== false && !meta.wrap && "block truncate",
            meta.wrap && "whitespace-normal",
          )}
          title={
            meta.tooltip ? undefined : meta.truncate !== false && !meta.wrap ? text : undefined
          }
        >
          {text}
        </span>
      );
      if (meta.tooltip && !blank) {
        const tip = typeof meta.tooltip === "function" ? meta.tooltip(value, row) : text;
        return (
          <Tooltip>
            <TooltipTrigger render={<span className="block min-w-0" />}>{content}</TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
        );
      }
      return content;
    }
  }
}

/** The cell a grouped row shows in a grouped column: a chevron, the value and the leaf count. */
export function DataGridGroupCell<TData extends RowData, TValue>(
  ctx: DataGridCellContext<TData, TValue>,
) {
  const grid = useDataGridContext<TData>();
  const meta = grid.metaFor(ctx.column.id);
  const value = ctx.getValue();
  const count = ctx.row.getLeafRows().filter((r) => !r.getIsGrouped()).length;
  const expanded = ctx.row.getIsExpanded();
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded-sm text-start font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={(e) => {
        e.stopPropagation();
        ctx.row.toggleExpanded();
      }}
      aria-expanded={expanded}
      aria-label={expanded ? grid.labels.collapse : grid.labels.expand}
    >
      {expanded ? (
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">
        {formatValue(value, meta, ctx.row.original, grid.locale, grid.labels.blank, grid.labels)}
      </span>
      <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
    </button>
  );
}

/** The aggregated value in a group row's other columns, formatted like the column. */
export function DataGridAggregatedCell<TData extends RowData, TValue>(
  ctx: DataGridCellContext<TData, TValue>,
) {
  const grid = useDataGridContext<TData>();
  const meta = grid.metaFor(ctx.column.id);
  const value = ctx.getValue() as unknown;
  const fns = ctx.column.getAggregationFns?.() ?? [];
  const id = fns[0]?.id;
  if (value === undefined || value === null) return null;
  let text: string;
  const fmt = (v: unknown) =>
    formatValue(v, meta, ctx.row.original, grid.locale, grid.labels.blank, grid.labels);
  if (Array.isArray(value) && id === "extent") {
    const [min, max] = value as [unknown, unknown];
    text = `${fmt(min)} – ${fmt(max)}`;
  } else if (id === "count" || id === "uniqueCount") {
    text = String(value);
  } else if (Array.isArray(value) && id === "unique") {
    text = value.length > 3 ? grid.labels.values(value.length) : value.map(String).join(", ");
  } else {
    text = fmt(value);
  }
  return (
    <span
      className={cn(
        "text-muted-foreground tabular-nums",
        alignClass(meta.align) === "text-end" && "block text-end",
      )}
      title={id ? `${id}` : undefined}
    >
      {text}
    </span>
  );
}

export function DataGridSelectHeader<TData extends RowData>(
  ctx: DataGridHeaderContext<TData, unknown>,
) {
  const grid = useDataGridContext<TData>();
  const { table } = ctx;
  const all = table.getIsAllPageRowsSelected();
  const some = table.getIsSomePageRowsSelected();
  if (table.options.enableMultiRowSelection === false) return null;
  return (
    <Checkbox
      checked={all}
      indeterminate={some && !all}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      aria-label={grid.labels.selectAll}
      className="translate-y-px"
    />
  );
}

export function DataGridSelectCell<TData extends RowData>(
  ctx: DataGridCellContext<TData, unknown>,
) {
  const grid = useDataGridContext<TData>();
  const { row } = ctx;
  if (!row.getCanSelect()) return null;
  const some = row.getIsSomeSelected();
  const all = row.getIsSelected();
  return (
    <Checkbox
      checked={all}
      indeterminate={some && !all}
      onCheckedChange={() => undefined}
      onClick={(e) => {
        e.stopPropagation();
        // TanStack reads `target.checked` (a native input) and `shiftKey` (a range since the last
        // click); Base UI's checkbox is a <span>, so hand it the shape it expects.
        row.getToggleSelectedHandler()({ target: { checked: !all }, shiftKey: e.shiftKey });
      }}
      aria-label={grid.labels.selectRow}
      className="translate-y-px"
    />
  );
}

export function DataGridExpanderCell<TData extends RowData>(
  ctx: DataGridCellContext<TData, unknown>,
) {
  const grid = useDataGridContext<TData>();
  const { row } = ctx;
  if (!row.getCanExpand()) return <span className="inline-block size-6" />;
  const expanded = row.getIsExpanded();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={expanded ? grid.labels.collapse : grid.labels.expand}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        row.toggleExpanded();
      }}
      style={{ marginInlineStart: row.depth * 16 }}
    >
      {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
    </Button>
  );
}

export function DataGridExpanderHeader<TData extends RowData>(
  ctx: DataGridHeaderContext<TData, unknown>,
) {
  const grid = useDataGridContext<TData>();
  const { table } = ctx;
  if (!table.getCanSomeRowsExpand()) return null;
  const all = table.getIsAllRowsExpanded();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={all ? grid.labels.collapseAll : grid.labels.expandAll}
      onClick={() => table.toggleAllRowsExpanded()}
    >
      {all ? <MinusIcon /> : <ChevronRightIcon />}
    </Button>
  );
}
