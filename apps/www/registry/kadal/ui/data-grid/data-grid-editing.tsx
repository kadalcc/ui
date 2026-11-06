import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

import { Checkbox } from "@/registry/kadal/ui/checkbox";
import { Input } from "@/registry/kadal/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kadal/ui/select";
import { Textarea } from "@/registry/kadal/ui/textarea";

import { useDataGridContext } from "./data-grid-context";
import type { DataGridCell } from "./data-grid-features";
import { toDate, toInputDate } from "./data-grid-format";
import type { DataGridEditorSpec } from "./data-grid-types";

export interface DataGridCellEditorProps<TData extends RowData> {
  cell: DataGridCell<TData, unknown>;
  spec: DataGridEditorSpec<unknown, TData>;
  /** Called after a commit or cancel so the cell can take focus back. */
  onDone: (direction?: "next" | "previous" | "down") => void;
}

const parseByType = (
  type: DataGridEditorSpec["type"],
  raw: string,
  spec: DataGridEditorSpec<unknown, any>,
  row: unknown,
): unknown => {
  if (spec.parse) return spec.parse(raw, row);
  switch (type) {
    case "number": {
      if (raw.trim() === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case "date":
    case "datetime": {
      if (!raw) return null;
      const d = toDate(raw);
      return d ?? raw;
    }
    default:
      return raw;
  }
};

/**
 * The inline editor shown in place of a cell: Enter commits, Escape cancels, Tab commits and moves
 * on, blur commits. Validation errors keep the editor open and show the message.
 */
export function DataGridCellEditor<TData extends RowData>({
  cell,
  spec,
  onDone,
}: DataGridCellEditorProps<TData>) {
  const grid = useDataGridContext<TData>();
  const { editing, labels } = grid;
  const type = spec.type ?? "text";
  const initial = cell.getValue();
  const row = cell.row.original;
  const [raw, setRaw] = React.useState(() => {
    if (type === "date" || type === "datetime") return toInputDate(initial, type === "datetime");
    return initial === null || initial === undefined ? "" : String(initial);
  });
  const committed = React.useRef(false);
  // The checkbox is a <span role="checkbox">; React's `autoFocus` only reaches form controls.
  const checkboxRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (type === "checkbox") checkboxRef.current?.focus();
  }, [type]);

  const commit = async (direction?: "next" | "previous" | "down", override?: unknown) => {
    if (committed.current) return;
    const value =
      override !== undefined
        ? override
        : type === "checkbox"
          ? initial
          : parseByType(type, raw, spec, row);
    const ok = await editing.commit(value);
    if (ok) {
      committed.current = true;
      onDone(direction);
    }
  };
  const cancel = () => {
    committed.current = true;
    editing.cancel();
    onDone();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    } else if (e.key === "Enter" && !(type === "textarea" && e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      void commit(e.shiftKey ? undefined : "down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      void commit(e.shiftKey ? "previous" : "next");
    } else {
      // Arrow keys and the rest belong to the editor, not the grid's navigation.
      e.stopPropagation();
    }
  };

  const error = editing.error;
  const common = {
    "aria-invalid": error ? true : undefined,
    "aria-label": `${labels.edit}: ${grid.labelFor(cell.column.id)}`,
    title: error ?? undefined,
    onKeyDown,
    onBlur: () => void commit(),
    autoFocus: true,
    className: cn(
      "h-full w-full rounded-sm border-0 bg-background px-1.5 shadow-none ring-2 ring-primary ring-inset focus-visible:ring-primary",
      error && "ring-destructive",
    ),
  };

  if (type === "checkbox") {
    return (
      <div className="flex h-full items-center justify-center" onKeyDown={onKeyDown}>
        <Checkbox
          ref={checkboxRef as React.Ref<never>}
          checked={Boolean(initial)}
          onCheckedChange={(checked) => void commit(undefined, checked)}
          onBlur={() => cancel()}
          aria-label={common["aria-label"]}
        />
      </div>
    );
  }

  if (type === "select") {
    const options = spec.options ?? [];
    return (
      <Select
        defaultOpen
        value={initial as string}
        items={options.map((o) => ({ value: o.value, label: o.label }))}
        onValueChange={(value) => void commit("down", value)}
        onOpenChange={(open) => {
          if (!open && !committed.current) cancel();
        }}
      >
        <SelectTrigger
          size="sm"
          className={common.className}
          aria-label={common["aria-label"]}
          onKeyDown={onKeyDown}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={String(o.value)} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        {...common}
        value={raw}
        placeholder={spec.placeholder}
        rows={3}
        className={cn(common.className, "min-h-0 resize-none py-1 text-sm")}
        onChange={(e) => setRaw(e.target.value)}
      />
    );
  }

  return (
    <Input
      {...common}
      type={
        type === "number"
          ? "number"
          : type === "date"
            ? "date"
            : type === "datetime"
              ? "datetime-local"
              : "text"
      }
      inputMode={type === "number" ? "decimal" : undefined}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      placeholder={spec.placeholder}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}
