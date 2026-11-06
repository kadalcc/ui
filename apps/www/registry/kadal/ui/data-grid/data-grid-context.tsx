import * as React from "react";
import type { RowData } from "@tanstack/react-table";

import type { DataGridApi } from "./use-data-grid";

// The grid's own context: every part (toolbar, header menu, pagination, cells) reads the api from
// here, so you can lay the parts out however you like inside <DataGridRoot>.
const DataGridContext = React.createContext<DataGridApi<any> | null>(null);

export function DataGridProvider<TData extends RowData>({
  grid,
  children,
}: {
  grid: DataGridApi<TData>;
  children: React.ReactNode;
}) {
  return <DataGridContext.Provider value={grid}>{children}</DataGridContext.Provider>;
}

export function useDataGridContext<TData extends RowData = RowData>(): DataGridApi<TData> {
  const ctx = React.useContext(DataGridContext);
  if (!ctx) {
    throw new Error("Data grid parts must be rendered inside <DataGrid> or <DataGridRoot>.");
  }
  return ctx as DataGridApi<TData>;
}

/** Like `useDataGridContext`, but null outside a grid (for parts that can stand alone). */
export function useOptionalDataGridContext<TData extends RowData = RowData>() {
  return React.useContext(DataGridContext) as DataGridApi<TData> | null;
}

/** Presentation state owned by <DataGridRoot>: the root element, fullscreen, loading and errors. */
export interface DataGridUiState {
  rootRef: React.RefObject<HTMLDivElement | null>;
  fullscreen: boolean;
  setFullscreen: (on: boolean) => void;
  loading: boolean;
  error: React.ReactNode | null;
  onRetry?: () => void;
  emptyState?: React.ReactNode;
  /** Announcements for screen readers (sorted, selected, copied…). */
  announce: (message: string) => void;
  announcement: string;
}

const DataGridUiContext = React.createContext<DataGridUiState | null>(null);

export const DataGridUiProvider = DataGridUiContext.Provider;

export function useDataGridUi(): DataGridUiState {
  const ctx = React.useContext(DataGridUiContext);
  if (!ctx) throw new Error("Data grid parts must be rendered inside <DataGrid> or <DataGridRoot>.");
  return ctx;
}
