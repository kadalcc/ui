import { parseAsInteger, parseAsJson, parseAsString, useQueryStates } from "nuqs";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { DataGridStateAdapter } from "@/registry/kadal/ui/data-grid/use-data-grid";

export interface DataGridUrlStateOptions {
  /** Prefix for the query keys, so two grids on one page don't collide. Default "grid". */
  key?: string;
  /** Put the sort in the URL too (off by default: it's a view preference, kept by `persist`). */
  sorting?: boolean;
  /** nuqs `history` for every key. Default "replace". */
  history?: "replace" | "push";
}

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Keeps the grid's *query* (column filters, the search box, the page, optionally the sort) in the
 * URL with nuqs, so a filtered view can be shared or bookmarked and survives a refresh. Spread the
 * result into `useDataGrid({ state })`:
 *
 * ```tsx
 * const urlState = useDataGridUrlState({ key: "orders" })
 * const grid = useDataGrid({ data, columns, state: urlState })
 * ```
 *
 * Needs a nuqs adapter around your app (`NuqsAdapter` from `nuqs/adapters/<framework>`).
 */
export function useDataGridUrlState({
  key = "grid",
  sorting = false,
  history = "replace",
}: DataGridUrlStateOptions = {}): DataGridStateAdapter {
  const [state, setState] = useQueryStates(
    {
      filters: parseAsJson<ColumnFiltersState>((v) =>
        asArray<ColumnFiltersState[number]>(v),
      ).withDefault([]),
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      sort: parseAsJson<SortingState>((v) => asArray<SortingState[number]>(v)).withDefault([]),
    },
    {
      urlKeys: {
        filters: `${key}.filters`,
        q: `${key}.q`,
        page: `${key}.page`,
        sort: `${key}.sort`,
      },
      history,
    },
  );

  const resolve = <T>(updater: T | ((old: T) => T), old: T): T =>
    typeof updater === "function" ? (updater as (o: T) => T)(old) : updater;

  return {
    columnFilters: state.filters,
    onColumnFiltersChange: (updater) =>
      void setState((old) => ({ filters: resolve(updater, old.filters), page: 1 })),
    globalFilter: state.q,
    onGlobalFilterChange: (updater) =>
      void setState((old) => ({ q: resolve(updater, old.q) ?? "", page: 1 })),
    pageIndex: Math.max(0, state.page - 1),
    onPageIndexChange: (pageIndex) => void setState({ page: pageIndex + 1 }),
    ...(sorting
      ? {
          sorting: state.sort,
          onSortingChange: (updater) =>
            void setState((old) => ({ sort: resolve(updater, old.sort) })),
        }
      : {}),
  };
}
