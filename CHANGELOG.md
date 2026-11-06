# Changelog

The registry's changelog: what changed in each item at ui.kadal.cc. An item lives in your project
once added, so there is no package to upgrade; `npx @kadal/ui diff data-grid` shows what a newer
version would change and `npx shadcn@latest add @kadal/data-grid --overwrite` brings it in. The
version of each item is `meta.version` in `apps/www/registry.json`. The `@kadal/ui` CLI has its own
changelog in [packages/cli/CHANGELOG.md](packages/cli/CHANGELOG.md).

## Data grid 0.1.0 — 2026-11-07

Initial release of `@kadal/data-grid`, a power-user data grid on TanStack Table v9 and shadcn/ui
(Base UI), MIT:

- **Typed columns.** `createDataGridColumns<T>()` with `text`, `number`, `currency`, `percent`,
  `date`, `datetime`, `boolean`, `enum`, `tags`, `link` and `custom` kinds, plus `display`,
  `group`, `select`, `expander`, `rowNumber` and `actions`; each kind brings its formatting,
  filter, editor and aggregation.
- **Sorting, filtering and search.** Multi-sort; faceted and typed filters per kind, shown as
  chips; fuzzy or plain global search.
- **Pagination**, client-side or against a server (`server: { rowCount }` with sorting,
  filtering, grouping and expanding handed to you).
- **Selection and bulk actions**, single or multiple, with range selection and a bulk-actions bar;
  row actions in an `actions` column.
- **Columns you can rearrange.** Visibility, pinning, drag reorder, resizing, with a view-options
  menu.
- **Tree data and grouping** with aggregation (sum, mean, extent, count, unique count by kind).
- **Virtualisation** of rows (`virtualize: true | "auto"`) for large sets.
- **Inline editing** per cell with kind-aware editors, `onCellEdit`, and Tab/Enter/Escape.
- **Cell selection** with keyboard navigation and clipboard copy.
- **Export** to CSV or JSON and copy to the clipboard (selected, formatted or visible only),
  **density** (compact, comfortable, spacious), **row pinning**, loading, empty and error states,
  fullscreen.
- **Persisted and saved views.** `persist` keeps the layout in storage; saved views can be named,
  applied, renamed and removed; `data-grid-url-state` (a separate hook item, on nuqs) keeps
  filters, search and page in the URL.
- **Composable.** `<DataGrid />` in one piece, or `useDataGrid` with `DataGridRoot`, `Toolbar`,
  `Table`, `Pagination`, `BulkActions`, `Search`, `FilterChips`, `ViewOptions`, `GroupMenu`,
  `DensityMenu`, `ExportMenu` and `ViewsMenu` in your own layout.
- **Accessible and localisable.** Keyboard throughout, ARIA grid semantics, every label
  overridable (`labels`), `locale` for numbers and dates.

Also in this release: `data-grid-url-state` 0.1.0 (the nuqs-backed URL state hook) and
`data-grid-demo-data` 0.1.0 (the seeded demo rows the examples use).
