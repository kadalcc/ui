"use client";

import * as React from "react";
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";

import {
  DataGrid,
  createDataGridColumns,
  filterFn_facet,
  filterFn_textOp,
  filterFn_range,
  rankMatch,
} from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

// ── A pretend API: 5,000 rows on "the server", paged, sorted and filtered there ──────────────────
const ALL = makePeople(5_000, 23);

interface Query {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
}

async function fetchPeople(q: Query): Promise<{ rows: Person[]; total: number }> {
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
  let rows = ALL;
  if (q.globalFilter)
    rows = rows.filter((p) => rankMatch(`${p.name} ${p.email} ${p.team}`, q.globalFilter) > 0);
  for (const f of q.columnFilters) {
    const fn =
      f.id === "status" || f.id === "plan"
        ? filterFn_facet
        : f.id === "mrr"
          ? filterFn_range
          : filterFn_textOp;
    rows = rows.filter((p) => fn.filter(p[f.id as keyof Person], f.value, null as never, f.id));
  }
  for (const s of [...q.sorting].reverse()) {
    rows = [...rows].sort((a, b) => {
      const x = a[s.id as keyof Person] as string | number | Date;
      const y = b[s.id as keyof Person] as string | number | Date;
      const r = x < y ? -1 : x > y ? 1 : 0;
      return s.desc ? -r : r;
    });
  }
  const start = q.pagination.pageIndex * q.pagination.pageSize;
  return { rows: rows.slice(start, start + q.pagination.pageSize), total: rows.length };
}

const col = createDataGridColumns<Person>();
const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.text("email", { header: "Email", size: 240 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const client = new QueryClient();

function ServerGrid() {
  // The grid owns the state; we read it back through the controlled `table` escape hatch.
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const query = useQuery({
    queryKey: ["people", pagination, sorting, columnFilters, globalFilter],
    queryFn: () => fetchPeople({ pagination, sorting, columnFilters, globalFilter }),
    placeholderData: keepPreviousData,
  });

  return (
    <DataGrid
      name="server"
      data={query.data?.rows ?? []}
      columns={columns}
      getRowId={(row) => row.id}
      server={{ rowCount: query.data?.total ?? 0 }}
      pagination={{ pageSize: 20 }}
      loading={query.isFetching}
      error={query.error ? query.error.message : null}
      onRetry={() => query.refetch()}
      table={{
        state: { pagination, sorting, columnFilters, globalFilter },
        onPaginationChange: (u) => setPagination((old) => (typeof u === "function" ? u(old) : u)),
        onSortingChange: (u) => setSorting((old) => (typeof u === "function" ? u(old) : u)),
        onColumnFiltersChange: (u) => {
          setColumnFilters((old) => (typeof u === "function" ? u(old) : u));
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        },
        onGlobalFilterChange: (u) => {
          setGlobalFilter((old) => (typeof u === "function" ? u(old) : u) ?? "");
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        },
      }}
      // Facets come from the server too; here we hand the grid the whole catalogue.
      grouping={false}
    />
  );
}

/** Server-side paging, sorting and filtering with TanStack Query; the grid only renders a page. */
export default function DataGridServer() {
  return (
    <QueryClientProvider client={client}>
      <ServerGrid />
    </QueryClientProvider>
  );
}
