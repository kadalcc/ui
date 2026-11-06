/**
 * Every string the grid shows, in one place, so a consumer can translate or reword the lot by
 * passing `labels` to `useDataGrid`/`<DataGrid>`. Functions receive the numbers they format.
 */
export interface DataGridLabels {
  search: string;
  clearFilters: string;
  filters: (count: number) => string;
  view: string;
  viewColumns: string;
  searchColumns: string;
  noColumns: string;
  hidden: (count: number) => string;
  showAll: string;
  resetView: string;
  density: string;
  densityCompact: string;
  densityComfortable: string;
  densitySpacious: string;
  export: string;
  exportCsv: string;
  exportJson: string;
  exportCopy: string;
  exportSelectedOnly: string;
  group: string;
  groupBy: (column: string) => string;
  ungroup: string;
  groupedBy: string;
  clearGrouping: string;
  savedViews: string;
  saveView: string;
  saveViewPrompt: string;
  deleteView: string;
  defaultView: string;
  fullscreen: string;
  exitFullscreen: string;
  sortAsc: string;
  sortDesc: string;
  clearSort: string;
  pinStart: string;
  pinEnd: string;
  unpin: string;
  hideColumn: string;
  autosize: string;
  autosizeAll: string;
  filter: string;
  filterPlaceholder: string;
  filterNoResults: string;
  filterApplied: (count: number) => string;
  filterContains: string;
  filterNotContains: string;
  filterStartsWith: string;
  filterEndsWith: string;
  filterEquals: string;
  filterIsEmpty: string;
  filterIsNotEmpty: string;
  filterMin: string;
  filterMax: string;
  filterFrom: string;
  filterTo: string;
  filterAny: string;
  filterTrue: string;
  filterFalse: string;
  applied: string;
  rowsPerPage: string;
  pageOf: (page: number, pages: number) => string;
  goToPage: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  selectedOf: (selected: number, total: number) => string;
  rowsCount: (total: number) => string;
  selectAll: string;
  selectRow: string;
  clearSelection: string;
  selected: (count: number) => string;
  expand: string;
  collapse: string;
  expandAll: string;
  collapseAll: string;
  pinRowTop: string;
  pinRowBottom: string;
  unpinRow: string;
  rowActions: string;
  loading: string;
  empty: string;
  emptyFiltered: string;
  error: string;
  retry: string;
  copied: (count: number) => string;
  edit: string;
  save: string;
  cancel: string;
  invalid: string;
  dragColumn: string;
  resizeColumn: string;
  keyboardHint: string;
  yes: string;
  no: string;
  blank: string;
}

export const defaultLabels: DataGridLabels = {
  search: "Search…",
  clearFilters: "Clear",
  filters: (n) => (n === 1 ? "1 filter" : `${n} filters`),
  view: "View",
  viewColumns: "Columns",
  searchColumns: "Search columns…",
  noColumns: "No columns found.",
  hidden: (n) => `${n} hidden`,
  showAll: "Show all",
  resetView: "Reset view",
  density: "Density",
  densityCompact: "Compact",
  densityComfortable: "Comfortable",
  densitySpacious: "Spacious",
  export: "Export",
  exportCsv: "Download CSV",
  exportJson: "Download JSON",
  exportCopy: "Copy to clipboard",
  exportSelectedOnly: "Selected rows only",
  group: "Group",
  groupBy: (c) => `Group by ${c}`,
  ungroup: "Ungroup",
  groupedBy: "Grouped by",
  clearGrouping: "Clear grouping",
  savedViews: "Views",
  saveView: "Save current view…",
  saveViewPrompt: "Name this view",
  deleteView: "Delete view",
  defaultView: "Default view",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
  sortAsc: "Sort ascending",
  sortDesc: "Sort descending",
  clearSort: "Clear sort",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  hideColumn: "Hide column",
  autosize: "Fit to content",
  autosizeAll: "Fit all columns",
  filter: "Filter",
  filterPlaceholder: "Search values…",
  filterNoResults: "No values found.",
  filterApplied: (n) => `${n} applied`,
  filterContains: "Contains",
  filterNotContains: "Does not contain",
  filterStartsWith: "Starts with",
  filterEndsWith: "Ends with",
  filterEquals: "Equals",
  filterIsEmpty: "Is empty",
  filterIsNotEmpty: "Is not empty",
  filterMin: "Min",
  filterMax: "Max",
  filterFrom: "From",
  filterTo: "To",
  filterAny: "Any",
  filterTrue: "Yes",
  filterFalse: "No",
  applied: "applied",
  rowsPerPage: "Rows per page",
  pageOf: (page, pages) => `Page ${page} of ${pages}`,
  goToPage: "Go to page",
  firstPage: "Go to first page",
  previousPage: "Go to previous page",
  nextPage: "Go to next page",
  lastPage: "Go to last page",
  selectedOf: (selected, total) => `${selected} of ${total} row(s) selected.`,
  rowsCount: (total) => (total === 1 ? "1 row" : `${total.toLocaleString()} rows`),
  selectAll: "Select all",
  selectRow: "Select row",
  clearSelection: "Clear selection",
  selected: (n) => (n === 1 ? "1 selected" : `${n} selected`),
  expand: "Expand",
  collapse: "Collapse",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  pinRowTop: "Pin row to top",
  pinRowBottom: "Pin row to bottom",
  unpinRow: "Unpin row",
  rowActions: "Row actions",
  loading: "Loading…",
  empty: "No records found.",
  emptyFiltered: "No rows match the current filters.",
  error: "Something went wrong.",
  retry: "Retry",
  copied: (n) => (n === 1 ? "Copied 1 cell" : `Copied ${n} cells`),
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  invalid: "Invalid value",
  dragColumn: "Drag to reorder column",
  resizeColumn: "Resize column",
  keyboardHint: "Use the arrow keys to move, Enter to edit, Space to select.",
  yes: "Yes",
  no: "No",
  blank: "—",
};

/** Merges a partial translation over the defaults. */
export function resolveLabels(labels?: Partial<DataGridLabels>): DataGridLabels {
  return labels ? { ...defaultLabels, ...labels } : defaultLabels;
}
