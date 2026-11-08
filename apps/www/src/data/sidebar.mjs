/**
 * The docs navigation, in reading order. Every slug is a file under src/content/docs/docs/.
 * llms.txt lists the docs in this order too.
 */
export const sidebar = [
  {
    label: "Start here",
    items: [
      { label: "Introduction", slug: "docs" },
      { label: "Installation", slug: "docs/installation" },
      { label: "Your first grid in 5 minutes", slug: "docs/quick-start" },
      { label: "Type safety", slug: "docs/type-safety" },
      { label: "Theming and styling", slug: "docs/theming" },
    ],
  },
  {
    label: "Data grid",
    items: [
      { label: "Overview", slug: "docs/data-grid" },
      { label: "Columns", slug: "docs/data-grid/columns" },
      { label: "Sorting", slug: "docs/data-grid/sorting" },
      { label: "Filtering", slug: "docs/data-grid/filtering" },
      { label: "Global search", slug: "docs/data-grid/search" },
      { label: "Pagination", slug: "docs/data-grid/pagination" },
      { label: "Row selection and bulk actions", slug: "docs/data-grid/selection" },
      { label: "Row actions", slug: "docs/data-grid/row-actions" },
      { label: "Column visibility", slug: "docs/data-grid/visibility" },
      { label: "Column pinning", slug: "docs/data-grid/pinning" },
      { label: "Column reordering", slug: "docs/data-grid/reordering" },
      { label: "Column resizing", slug: "docs/data-grid/resizing" },
      { label: "Expanding and tree data", slug: "docs/data-grid/expanding" },
      { label: "Grouping and aggregation", slug: "docs/data-grid/grouping" },
      { label: "Virtualisation", slug: "docs/data-grid/virtualization" },
      { label: "Inline editing", slug: "docs/data-grid/editing" },
      { label: "Cell selection and clipboard", slug: "docs/data-grid/cell-selection" },
      { label: "Keyboard navigation", slug: "docs/data-grid/keyboard" },
      { label: "Export", slug: "docs/data-grid/export" },
      { label: "Density", slug: "docs/data-grid/density" },
      { label: "Row pinning", slug: "docs/data-grid/row-pinning" },
      { label: "Loading and empty states", slug: "docs/data-grid/states" },
      { label: "Saved views and persistence", slug: "docs/data-grid/persistence" },
      { label: "URL state", slug: "docs/data-grid/url-state" },
      { label: "Server-side data", slug: "docs/data-grid/server-side" },
      { label: "Accessibility", slug: "docs/data-grid/accessibility" },
      { label: "Internationalisation", slug: "docs/data-grid/i18n" },
      { label: "Composition and custom layouts", slug: "docs/data-grid/composition" },
      { label: "API reference", slug: "docs/data-grid/api" },
    ],
  },
  {
    label: "Tooling",
    items: [
      { label: "CLI reference", slug: "docs/cli" },
      { label: "AI agents and MCP", slug: "docs/ai-agents" },
      { label: "Playground", link: "/playground/" },
    ],
  },
  {
    label: "Project",
    items: [
      { label: "Compared with other grids", slug: "docs/compare" },
      { label: "FAQ", slug: "docs/faq" },
      { label: "Changelog", link: "/changelog/" },
      { label: "Contributing", slug: "docs/contributing" },
      { label: "Sponsor", link: "/sponsor/" },
    ],
  },
];

/** Every docs page's slug in sidebar order, for lists that should read the way the sidebar does. */
export const docsOrder = sidebar.flatMap((group) =>
  group.items.filter((item) => "slug" in item).map((item) => item.slug),
);
