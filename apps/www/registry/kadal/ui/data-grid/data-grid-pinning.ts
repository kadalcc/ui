import type * as React from "react";
import type { RowData } from "@tanstack/react-table";

import type { DataGridColumn } from "./data-grid-features";

/**
 * Sticky positioning for a pinned column's header and cells. `start`/`end` are TanStack v9's
 * logical regions, so the grid pins correctly in RTL layouts through `inset-inline-*`.
 */
export function getPinningStyles<TData extends RowData>(
  column: DataGridColumn<TData, unknown>,
  { header = false }: { header?: boolean } = {},
): React.CSSProperties {
  const pinned = column.getIsPinned();
  const size = column.getSize();
  const base: React.CSSProperties = { width: size, minWidth: size, maxWidth: size };
  if (!pinned) return base;
  return {
    ...base,
    position: "sticky",
    insetInlineStart: pinned === "start" ? column.getStart("start") : undefined,
    insetInlineEnd: pinned === "end" ? column.getAfter("end") : undefined,
    zIndex: header ? 30 : 10,
  };
}

/** Classes that give a pinned column an opaque background and an edge shadow where it ends. */
export function pinningClasses<TData extends RowData>(
  column: DataGridColumn<TData, unknown>,
): string {
  const pinned = column.getIsPinned();
  if (!pinned) return "";
  const classes = ["bg-background"];
  if (pinned === "start" && column.getIsLastColumn("start")) {
    classes.push("shadow-[inset_-1px_0_0_0_var(--border)]");
  }
  if (pinned === "end" && column.getIsFirstColumn("end")) {
    classes.push("shadow-[inset_1px_0_0_0_var(--border)]");
  }
  return classes.join(" ");
}
