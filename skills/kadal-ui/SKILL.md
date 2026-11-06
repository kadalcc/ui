---
name: kadal-ui
description: Add Kadal UI's data grid — a power-user React data grid on TanStack Table v9 and shadcn/ui (Base UI) — to a project and use it well. Install it from the shadcn registry, build typed columns with createDataGridColumns, render <DataGrid>, compose the parts around useDataGrid, keep filters in the URL, page against a server. Use when the user wants a data table or data grid with sorting, filtering, search, selection, inline editing, grouping, tree rows, virtualisation or export in a React + shadcn project, when a project already has components/ui/data-grid or the @kadal registry in components.json, or when they mention Kadal UI, ui.kadal.cc or @kadal/data-grid.
license: MIT
compatibility: React 19, Tailwind CSS v4 and shadcn/ui on Base UI (`npx shadcn@latest init -b base`). Node 20.19+ for the CLIs. A shadcn project on Radix needs its primitives on Base UI first.
metadata:
  homepage: https://ui.kadal.cc
  repository: https://github.com/kadalcc/ui
---

# Kadal UI · Data grid

The grid is source you copy, not a dependency. It lands in `components/ui/data-grid/` (21
files, MIT) and is imported from `@/components/ui/data-grid`; `index.ts` re-exports everything.
Edit it like the user's own code, but prefer the options below to patching the files, so a later
`add --overwrite` stays painless.

## 1. Install

```sh
npx shadcn@latest add @kadal/data-grid        # once components.json knows the @kadal registry
npx @kadal/ui add data-grid                   # same thing; registers the registry first if needed
npx @kadal/ui add data-grid-url-state         # the URL-state hook (brings nuqs)
```

- No `components.json`? `npx shadcn@latest init -b base` first (`npx @kadal/ui init` does that
  and registers the registry). The grid builds on Base UI primitives (`@base-ui/react`), not
  Radix: `-b base` is a requirement, not a preference.
- The add installs `@tanstack/react-table@^9`, `@tanstack/react-virtual`, `@dnd-kit/react`,
  `@dnd-kit/dom` and `lucide-react`, and the shadcn items the grid uses (badge, button, checkbox,
  dialog, dropdown-menu, empty, input, label, popover, select, spinner, textarea, tooltip).
- Already there? `npx @kadal/ui diff data-grid` shows what a newer version changes before an
  `--overwrite`; the user's edits to the files are theirs to keep.
- In a Next.js app the grid is a client component: `"use client"` at the top of the file that
  renders it.

## 2. Columns

`createDataGridColumns<T>()` returns a builder; one method per kind. Each kind brings its
formatting, filter UI, editor and default aggregation, so prefer the right kind over `custom`.

```tsx
import { createDataGridColumns } from "@/components/ui/data-grid";

const col = createDataGridColumns<Person>();

export const columns = col.columns([
  col.select(),                                                     // checkbox column (needs selection)
  col.text("name", { header: "Name" }),
  col.link("email", { header: "Email", href: (v) => `mailto:${v}` }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }), // [{ value, label, icon?, className? }]
  col.tags("labels", { header: "Labels", options: LABEL_OPTIONS }),  // string[] values
  col.number("seats", { header: "Seats" }),
  col.currency("mrr", { header: "MRR", currency: "USD", editable: true }),
  col.percent("growth", { header: "Growth" }),                       // 0.12 → 12%
  col.boolean("active", { header: "Active" }),
  col.date("joinedAt", { header: "Joined" }),                        // Date | string | number
  col.datetime("lastSeenAt", { header: "Last seen" }),
  col.custom("score", { header: "Score", cell: ({ getValue }) => <Score value={getValue()} /> }),
  col.actions(({ row }) => <RowMenu person={row.original} />),      // trailing, pinned right
]);
```

- Kinds: `text` `number` `currency` `percent` `date` `datetime` `boolean` `enum` `tags` `link`
  `custom` take `(accessorKey, options?)`. Utilities: `display({ id, ...options })` (no accessor),
  `group(header, columns, options?)` (a header spanning columns), `select()`, `expander()` (tree
  rows), `rowNumber()`, `actions(cell, options?)`. `columns([...])` types the array.
- Options on every column, on top of TanStack's (`size`, `minSize`, `enableSorting`, `footer`,
  `cell`, `sortingFn`…): `header` (string or render), `label` (for menus, when the header is a
  render), `description`, `align`, `filter` (a filter kind, or `false`), `editable` (`true` or an
  editor spec), `onEdit`, `format(value, row)`, `options` (enum/tags), `currency`, `locale`,
  `minimumFractionDigits`/`maximumFractionDigits`, `dateStyle`/`timeStyle`, `href`/`target`
  (link), `export` (`false` or a mapper), `truncate`, `wrap`, `mono`, `headerClassName`,
  `cellClassName`, `tooltip`, `groupable`, `draggable`, `stable` (not reorderable), `meta`.
- Keep `columns` outside the component (module scope or `useMemo`): a new array each render is a
  new table.

## 3. Render

The whole grid in one component: toolbar (search, filter chips, view options, density, export),
table, pager and bulk-actions bar.

```tsx
import { DataGrid } from "@/components/ui/data-grid";

<DataGrid
  name="people"                        // a stable id; also the default persist key
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}           // always, when rows have ids: selection and editing key on it
  persist                              // column order, sizes, visibility, density… in localStorage
  selection                            // or { mode: "single", enable: (row) => !row.locked, range: true }
  editing                              // or { canEdit: (row) => row.editable }
  onCellEdit={async ({ row, columnId, value, previous }) => save(row.id, columnId, value)}
  bulkActions={(rows, api) => <Button onClick={() => archive(rows)}>Archive {rows.length}</Button>}
  height={560}                         // px or CSS; sticky header inside; omit to grow with rows
  pagination={{ pageSize: 25, pageSizeOptions: [25, 50, 100] }}   // or false
  virtualize="auto"                    // or true / { overscan, threshold }; large sets only
  grouping                             // the group menu and a grouping bar
  rowPinning
  globalFilter="fuzzy"                 // "includesString", or false to hide the search
  loading={isPending} error={error} onRetry={refetch} emptyState={<Empty />}
/>
```

- `useDataGrid` options (all also props of `<DataGrid>`): `data`, `columns`, `name`, `getRowId`,
  `getSubRows` (tree data), `initialState` (TanStack state plus `density`), `pagination`,
  `server`, `virtualize`, `density`/`defaultDensity`/`onDensityChange`, `persist` (`true`, a
  key, or `{ key, storage, scope, savedViews }`), `selection`, `cellSelection` (range select,
  arrows, copy), `editing`, `onCellEdit`, `grouping`, `rowPinning`, `globalFilter`, `labels`
  (every string, for i18n), `locale`, `state` (an adapter: controlled filters/search/page/
  sorting/grouping), `table` (anything else TanStack takes).
- Presentation props of `<DataGrid>`: `toolbar` (`false`, a node, or toolbar props),
  `toolbarActions` (your buttons in the toolbar), `pager` (`false` or pager props),
  `bulkActions`, `height`, `fillHeight`, `stickyHeader`, `striped`, `getRowClassName`,
  `onRowClick`, `loading`, `error`, `onRetry`, `emptyState`, `fullscreen`/`onFullscreenChange`,
  `className`, `tableClassName`.
- `onCellEdit` receives `{ rowId, rowIndex, row, columnId, value, previous }`; throw or return a
  rejected promise to keep the editor open with the error. The grid doesn't mutate `data`: update
  your state (or refetch) and the row re-renders.

## 4. Compose the parts

When the layout is the user's: build the grid with `useDataGrid`, wrap in `DataGridRoot`, place
the parts anywhere inside.

```tsx
import {
  DataGridRoot, DataGridToolbar, DataGridTable, DataGridPagination, DataGridBulkActions,
  DataGridSearch, DataGridFilterChips, DataGridViewOptions, DataGridGroupMenu, DataGridDensityMenu,
  DataGridExportMenu, DataGridViewsMenu, useDataGrid,
} from "@/components/ui/data-grid";

const grid = useDataGrid<Person>({ name: "people", data, columns, getRowId: (r) => r.id, persist: { savedViews: true } });

<DataGridRoot grid={grid} loading={isPending}>
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <h2 className="font-semibold">Customers</h2>
      <DataGridSearch className="max-w-56" />
      <DataGridFilterChips />
    </div>
    <div className="flex items-center gap-2">
      <DataGridViewsMenu />       {/* saved views; needs persist.savedViews */}
      <DataGridGroupMenu />       {/* needs grouping */}
      <DataGridViewOptions />     {/* columns: show, hide, pin, order */}
      <DataGridDensityMenu />
      <DataGridExportMenu filename="customers" />
      <Button size="sm">New customer</Button>
    </div>
  </div>
  <DataGridBulkActions>{(rows) => <Button size="sm">Export {rows.length}</Button>}</DataGridBulkActions>
  <DataGridTable height={420} striped />
  <DataGridPagination />
</DataGridRoot>
```

`DataGridToolbar` is the whole default toolbar as one part, when only its placement changes. The
`grid` object is the API outside the parts: `grid.table` (the TanStack table), `grid.views`
(`save(name)`, `apply(id)`, `remove`, `rename`, `reset`, `saved`), `grid.editing`
(`start(rowId, columnId)`, `commit`, `cancel`), `grid.exportCsv(filename?, options?)`,
`grid.exportJson`, `grid.copyToClipboard`, `grid.density`/`setDensity`, `grid.labelFor(columnId)`.

## 5. URL state

Filters, the search and the page in the URL, so a view can be shared:

```tsx
import { NuqsAdapter } from "nuqs/adapters/next/app";          // or /react, /react-router, /remix…
import { useDataGridUrlState } from "@/hooks/use-data-grid-url-state";

const urlState = useDataGridUrlState({ key: "people" });        // ?people.filters=…&people.q=…&people.page=2
const grid = useDataGrid<Person>({ name: "people", data, columns, getRowId: (r) => r.id, state: urlState });
```

The `NuqsAdapter` for the user's router must wrap the tree once (app root or layout). Pair it with
`persist` for the layout: what the user is looking for goes in the URL, how the grid looks goes in
storage, and the two don't overlap.

## 6. Server-side

Hand paging, sorting and filtering to the server with `server`, and read the state back through
TanStack's controlled options:

```tsx
const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
const [sorting, setSorting] = useState<SortingState>([]);
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
const [globalFilter, setGlobalFilter] = useState("");
const query = useQuery({ queryKey: ["people", pagination, sorting, columnFilters, globalFilter], queryFn: ..., placeholderData: keepPreviousData });

<DataGrid
  name="people" data={query.data?.rows ?? []} columns={columns} getRowId={(r) => r.id}
  server={{ rowCount: query.data?.total ?? 0 }}           // sorting/filtering/grouping default to server-side
  loading={query.isPending}
  table={{
    state: { pagination, sorting, columnFilters, globalFilter },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: (u) => { setColumnFilters(u); setPagination((p) => ({ ...p, pageIndex: 0 })); },
    onGlobalFilterChange: (u) => { setGlobalFilter(u); setPagination((p) => ({ ...p, pageIndex: 0 })); },
  }}
/>
```

Enum facets come from the column's `options`; give the server's catalogue, not the page's.
`server: { sorting: false }` keeps sorting client-side within the page, and likewise `filtering`,
`grouping`, `expanding`.

## Checklist before handing back

1. **Typecheck.** `tsc --noEmit` (or the project's `typecheck`) is clean: every accessor in
   `columns` is a key of `T`, every `options` value is the column's value type.
2. **Render it.** Open the page: rows show, the header sorts on click, the search finds a row, a
   filter chip appears and clears, the pager moves. With `editing`, double-click (or Enter) opens
   an editor and Escape closes it. Check an empty `data` and the `loading` state.
3. **Keyboard.** Tab into the grid, arrows move the focus cell, Space toggles selection, Enter
   edits, Shift+arrows extend a cell range, Ctrl/Cmd+C copies. Nothing traps focus.
4. **Persistence.** Reload: with `persist`, column order and density survive; with URL state, the
   filters come back from the URL. Two grids on one page have different `name`s.
5. **Dark mode and density.** Both themes, `compact` and `spacious`.

## Docs

- https://ui.kadal.cc/docs/data-grid/ — overview; `/columns/`, `/filtering/`, `/selection/`,
  `/editing/`, `/grouping/`, `/expanding/`, `/server-side/`, `/persistence/`, `/url-state/`,
  `/composition/`, `/keyboard/`, `/accessibility/`, `/i18n/`, `/api/` (every option and part).
- https://ui.kadal.cc/docs/installation/ and `/docs/ai-agents/` — setting a project up, the shadcn
  MCP server (`npx @kadal/ui mcp`) so an agent can add registry items itself.
- Source: https://github.com/kadalcc/ui — `apps/www/registry/kadal/ui/data-grid` is the truth
  about the API; `apps/www/registry/kadal/examples` has a working example per feature.
