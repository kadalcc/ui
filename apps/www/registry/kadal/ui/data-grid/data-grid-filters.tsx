import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { CircleXIcon, SearchIcon, XIcon } from "lucide-react";

import { Badge } from "@/registry/kadal/ui/badge";
import { Button } from "@/registry/kadal/ui/button";
import { Checkbox } from "@/registry/kadal/ui/checkbox";
import { Input } from "@/registry/kadal/ui/input";
import { Label } from "@/registry/kadal/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kadal/ui/select";

import { useDataGridContext } from "./data-grid-context";
import type { DataGridColumn } from "./data-grid-features";
import { formatValue, toInputDate } from "./data-grid-format";
import type { DataGridLabels } from "./data-grid-labels";
import type {
  DataGridColumnMeta,
  DataGridDateRangeFilterValue,
  DataGridFilterKind,
  DataGridRangeFilterValue,
  DataGridTextFilterOp,
  DataGridTextFilterValue,
} from "./data-grid-types";
import { useDebouncedValue } from "./data-grid-utils";

/** The filter UI a column gets: declared, or from its kind. */
export function resolveFilterKind(meta: DataGridColumnMeta): DataGridFilterKind | false {
  if (meta.filter !== undefined) return meta.filter;
  switch (meta.kind) {
    case "number":
    case "currency":
    case "percent":
      return "range";
    case "date":
    case "datetime":
      return "dateRange";
    case "boolean":
      return "boolean";
    case "enum":
    case "tags":
      return "facet";
    case "select":
    case "expander":
    case "rowNumber":
    case "actions":
      return false;
    default:
      return "text";
  }
}

const TEXT_OPS: DataGridTextFilterOp[] = [
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "equals",
  "isEmpty",
  "isNotEmpty",
];

function opLabel(op: DataGridTextFilterOp, labels: DataGridLabels): string {
  switch (op) {
    case "notContains":
      return labels.filterNotContains;
    case "startsWith":
      return labels.filterStartsWith;
    case "endsWith":
      return labels.filterEndsWith;
    case "equals":
      return labels.filterEquals;
    case "isEmpty":
      return labels.filterIsEmpty;
    case "isNotEmpty":
      return labels.filterIsNotEmpty;
    default:
      return labels.filterContains;
  }
}

/** One line describing a column's active filter, for the chips bar. */
export function filterSummary(
  value: unknown,
  kind: DataGridFilterKind | false,
  meta: DataGridColumnMeta,
  labels: DataGridLabels,
  locale: string | undefined,
): string {
  if (value === undefined || value === null) return "";
  switch (kind) {
    case "facet": {
      const items = Array.isArray(value) ? value : [value];
      const names = items.map((v) =>
        meta.options?.find((o) => String(o.value) === String(v))?.label ?? String(v),
      );
      return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
    }
    case "text": {
      const v = value as DataGridTextFilterValue | string;
      if (typeof v === "string") return `${labels.filterContains.toLowerCase()} “${v}”`;
      if (v.op === "isEmpty" || v.op === "isNotEmpty") return opLabel(v.op, labels).toLowerCase();
      return `${opLabel(v.op, labels).toLowerCase()} “${v.value}”`;
    }
    case "range": {
      const v = value as DataGridRangeFilterValue;
      const fmt = (n: number | null | undefined) =>
        n === null || n === undefined ? "" : formatValue(n, meta, undefined, locale);
      if (v.min != null && v.max != null) return `${fmt(v.min)} – ${fmt(v.max)}`;
      if (v.min != null) return `≥ ${fmt(v.min)}`;
      if (v.max != null) return `≤ ${fmt(v.max)}`;
      return "";
    }
    case "dateRange": {
      const v = value as DataGridDateRangeFilterValue;
      const fmt = (d: string | null | undefined) =>
        d ? formatValue(d, { ...meta, kind: "date" }, undefined, locale) : "";
      if (v.from && v.to) return `${fmt(v.from)} – ${fmt(v.to)}`;
      if (v.from) return `${labels.filterFrom.toLowerCase()} ${fmt(v.from)}`;
      if (v.to) return `${labels.filterTo.toLowerCase()} ${fmt(v.to)}`;
      return "";
    }
    case "boolean":
      return value ? labels.filterTrue : labels.filterFalse;
    default:
      return String(value);
  }
}

// ── The filter editors ────────────────────────────────────────────────────────────────────────────

function FacetFilter<TData extends RowData>({ column }: { column: DataGridColumn<TData, unknown> }) {
  const grid = useDataGridContext<TData>();
  const { labels } = grid;
  const meta = grid.metaFor(column.id);
  const [query, setQuery] = React.useState("");
  const q = useDebouncedValue(query, 120).toLowerCase();
  const raw = column.getFilterValue();
  const selected = React.useMemo(
    () => new Set((Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map(String)),
    [raw],
  );
  const facets = column.getFacetedUniqueValues();
  const entries = React.useMemo(() => {
    // Declared options first, in their order; then anything else the data holds.
    const seen = new Set<string>();
    const list: { key: string; value: unknown; label: string; count: number }[] = [];
    for (const option of meta.options ?? []) {
      const key = String(option.value);
      seen.add(key);
      list.push({ key, value: option.value, label: option.label, count: facets.get(option.value) ?? facetCount(facets, key) });
    }
    for (const [value, count] of facets) {
      const key = String(value);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        key,
        value,
        label: value === null || value === undefined || value === "" ? labels.blank : String(value),
        count,
      });
    }
    return q ? list.filter((e) => e.label.toLowerCase().includes(q)) : list;
  }, [facets, meta.options, q, labels.blank]);

  const toggle = (key: string, value: unknown) => {
    const next = new Set(selected);
    const current = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) as unknown[];
    const nextValues = next.has(key)
      ? current.filter((v) => String(v) !== key)
      : [...current, value];
    column.setFilterValue(nextValues.length ? nextValues : undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.filterPlaceholder}
          className="h-8 pl-7 text-sm"
          aria-label={labels.filterPlaceholder}
        />
      </div>
      <ul className="-mx-1 max-h-56 overflow-y-auto py-0.5" role="listbox" aria-multiselectable="true">
        {entries.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">{labels.filterNoResults}</li>
        ) : (
          entries.map((e) => {
            const checked = selected.has(e.key);
            return (
              <li key={e.key} role="option" aria-selected={checked}>
                <label className="flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(e.key, e.value)} />
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{e.count}</span>
                </label>
              </li>
            );
          })
        )}
      </ul>
      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-xs text-muted-foreground">
          {selected.size ? labels.filterApplied(selected.size) : labels.filterAny}
        </span>
        {selected.size ? (
          <Button variant="ghost" size="xs" onClick={() => column.setFilterValue(undefined)}>
            <CircleXIcon /> {labels.clearFilters}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function facetCount(facets: Map<unknown, number>, key: string): number {
  for (const [value, count] of facets) if (String(value) === key) return count;
  return 0;
}

function TextFilter<TData extends RowData>({ column }: { column: DataGridColumn<TData, unknown> }) {
  const { labels } = useDataGridContext<TData>();
  const raw = column.getFilterValue() as DataGridTextFilterValue | string | undefined;
  const value: DataGridTextFilterValue =
    typeof raw === "string" ? { op: "contains", value: raw } : (raw ?? { op: "contains", value: "" });
  const needsValue = value.op !== "isEmpty" && value.op !== "isNotEmpty";
  const set = (next: DataGridTextFilterValue) => column.setFilterValue(next);
  return (
    <div className="flex flex-col gap-2">
      <Select
        value={value.op}
        onValueChange={(op) => set({ ...value, op: op as DataGridTextFilterOp })}
      >
        <SelectTrigger size="sm" className="w-full" aria-label={labels.filter}>
          <SelectValue>{(op: DataGridTextFilterOp) => opLabel(op, labels)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TEXT_OPS.map((op) => (
            <SelectItem key={op} value={op}>
              {opLabel(op, labels)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsValue ? (
        <Input
          autoFocus
          value={value.value}
          onChange={(e) => set({ ...value, value: e.target.value })}
          placeholder={labels.filterPlaceholder}
          className="h-8 text-sm"
          aria-label={labels.filter}
        />
      ) : null}
    </div>
  );
}

function RangeFilter<TData extends RowData>({ column }: { column: DataGridColumn<TData, unknown> }) {
  const { labels } = useDataGridContext<TData>();
  const value = (column.getFilterValue() as DataGridRangeFilterValue | undefined) ?? {};
  const [min, max] = column.getFacetedMinMaxValues() ?? [undefined, undefined];
  const update = (patch: DataGridRangeFilterValue) => {
    const next = { ...value, ...patch };
    column.setFilterValue(next.min == null && next.max == null ? undefined : next);
  };
  const parse = (s: string) => (s.trim() === "" ? null : Number(s));
  return (
    <div className="grid grid-cols-2 gap-2">
      <Label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {labels.filterMin}
        <Input
          type="number"
          inputMode="decimal"
          value={value.min ?? ""}
          placeholder={min !== undefined ? String(min) : ""}
          onChange={(e) => update({ min: parse(e.target.value) })}
          className="h-8 text-sm tabular-nums"
        />
      </Label>
      <Label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {labels.filterMax}
        <Input
          type="number"
          inputMode="decimal"
          value={value.max ?? ""}
          placeholder={max !== undefined ? String(max) : ""}
          onChange={(e) => update({ max: parse(e.target.value) })}
          className="h-8 text-sm tabular-nums"
        />
      </Label>
    </div>
  );
}

function DateRangeFilter<TData extends RowData>({ column }: { column: DataGridColumn<TData, unknown> }) {
  const grid = useDataGridContext<TData>();
  const { labels } = grid;
  const withTime = grid.metaFor(column.id).kind === "datetime";
  const value = (column.getFilterValue() as DataGridDateRangeFilterValue | undefined) ?? {};
  const update = (patch: DataGridDateRangeFilterValue) => {
    const next = { ...value, ...patch };
    column.setFilterValue(!next.from && !next.to ? undefined : next);
  };
  const type = withTime ? "datetime-local" : "date";
  return (
    <div className="grid grid-cols-2 gap-2">
      <Label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {labels.filterFrom}
        <Input
          type={type}
          value={toInputDate(value.from, withTime)}
          onChange={(e) => update({ from: e.target.value || null })}
          className="h-8 text-sm"
        />
      </Label>
      <Label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {labels.filterTo}
        <Input
          type={type}
          value={toInputDate(value.to, withTime)}
          onChange={(e) => update({ to: e.target.value || null })}
          className="h-8 text-sm"
        />
      </Label>
    </div>
  );
}

function BooleanFilter<TData extends RowData>({ column }: { column: DataGridColumn<TData, unknown> }) {
  const { labels } = useDataGridContext<TData>();
  const value = column.getFilterValue() as boolean | undefined;
  const options: { key: string; label: string; value: boolean | undefined }[] = [
    { key: "any", label: labels.filterAny, value: undefined },
    { key: "true", label: labels.filterTrue, value: true },
    { key: "false", label: labels.filterFalse, value: false },
  ];
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={labels.filter}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Button
            key={o.key}
            role="radio"
            aria-checked={active}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => column.setFilterValue(o.value)}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

/** The right filter editor for a column, by its kind. */
export function DataGridColumnFilter<TData extends RowData>({
  column,
}: {
  column: DataGridColumn<TData, unknown>;
}) {
  const grid = useDataGridContext<TData>();
  const kind = resolveFilterKind(grid.metaFor(column.id));
  switch (kind) {
    case "facet":
      return <FacetFilter column={column} />;
    case "range":
      return <RangeFilter column={column} />;
    case "dateRange":
      return <DateRangeFilter column={column} />;
    case "boolean":
      return <BooleanFilter column={column} />;
    case "text":
      return <TextFilter column={column} />;
    default:
      return null;
  }
}

/** The active column filters as removable chips, plus "Clear" when there are any. */
export function DataGridFilterChips<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const filters = table.state.columnFilters;
  if (!filters.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} data-slot="data-grid-filter-chips">
      {filters.map((f) => {
        const column = table.getColumn(f.id);
        if (!column) return null;
        const meta = grid.metaFor(f.id);
        const summary = filterSummary(f.value, resolveFilterKind(meta), meta, labels, grid.locale);
        return (
          <Badge key={f.id} variant="secondary" className="h-6 gap-1 pr-1 font-normal">
            <span className="font-medium">{grid.labelFor(f.id)}</span>
            <span className="text-muted-foreground">{summary}</span>
            <button
              type="button"
              className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
              aria-label={`${labels.clearFilters}: ${grid.labelFor(f.id)}`}
              onClick={() => column.setFilterValue(undefined)}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        );
      })}
      {filters.length > 1 ? (
        <Button variant="ghost" size="xs" onClick={() => table.resetColumnFilters()}>
          <CircleXIcon /> {labels.clearFilters}
        </Button>
      ) : null}
    </div>
  );
}
