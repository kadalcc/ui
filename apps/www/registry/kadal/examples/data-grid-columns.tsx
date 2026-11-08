"use client";

import {
  DataGrid,
  createDataGridColumns,
  type DataGridColumnDef,
} from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type Person,
} from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

/** A plain TanStack column def still works. Its kind is inferred from the data (a string: text). */
const country: DataGridColumnDef<Person, string> = {
  id: "country",
  accessorKey: "country",
  header: "Country",
  filterFn: "text",
};

const columns = col.columns([
  col.rowNumber(),
  col.display({
    id: "avatar",
    size: 48,
    cell: ({ row }) => (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
        {row.original.name
          .split(" ")
          .map((w) => w[0])
          .join("")}
      </span>
    ),
  }),
  col.text("name", { header: "Name", size: 170 }),
  // A header that spans columns. Wrap the children in `col.columns` so their value types survive.
  col.group(
    "Billing",
    col.columns([
      col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 110 }),
      col.currency("mrr", { header: "MRR", currency: "USD", size: 110 }),
      col.number("seats", { header: "Seats", size: 110 }),
      // An accessor function needs an id; the value type still flows from what it returns.
      col.currency((row) => row.mrr * 12, { id: "arr", header: "ARR", currency: "USD", size: 110 }),
    ]),
  ),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS, size: 120 }),
  col.link("email", { header: "Email", href: (v) => `mailto:${v}`, size: 220 }),
  // A custom cell on a typed column: `getValue()` is a number here, and sort, filter and export stay by kind.
  col.percent("usage", {
    header: "Usage",
    size: 160,
    cell: ({ getValue }) => {
      const pct = Math.round(getValue() * 100);
      return (
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
          <span className="w-9 text-end tabular-nums">{pct}%</span>
        </span>
      );
    },
  }),
  col.boolean("active", { header: "Active", size: 90 }),
  col.date("joinedAt", { header: "Joined", size: 130 }),
  col.datetime("lastSeenAt", { header: "Last seen", dateStyle: "short", size: 160 }),
  col.tags("tags", { header: "Tags", size: 180 }),
  country,
  col.text("notes", { header: "Notes", wrap: true, filter: false, size: 220 }),
]);

const data = makePeople(80, 11);

/** Most column kinds on one grid, with a group header, a custom cell and a plain TanStack def. */
export default function DataGridColumns() {
  return <DataGrid data={data} columns={columns} getRowId={(row) => row.id} selection={false} />;
}
