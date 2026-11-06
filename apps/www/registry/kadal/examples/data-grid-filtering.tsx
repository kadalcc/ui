"use client";

import { CircleCheckIcon, CircleXIcon, MailIcon, PauseCircleIcon } from "lucide-react";

import {
  DataGrid,
  createDataGridColumns,
  type DataGridOption,
} from "@/registry/kadal/ui/data-grid";

import {
  makePeople,
  PLAN_OPTIONS,
  type Person,
  type Status,
} from "@/registry/kadal/lib/data-grid-demo-data";

/** Options give the facet its order and labels, and the badge its icon and colour. */
const STATUS: DataGridOption<Status>[] = [
  {
    value: "active",
    label: "Active",
    icon: CircleCheckIcon,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "invited",
    label: "Invited",
    icon: MailIcon,
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    value: "paused",
    label: "Paused",
    icon: PauseCircleIcon,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    value: "churned",
    label: "Churned",
    icon: CircleXIcon,
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
];

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name", size: 180 }), // text: contains, starts with, is empty…
  col.enum("status", { header: "Status", options: STATUS, size: 130 }), // facet, from options
  col.enum("plan", { header: "Plan", options: PLAN_OPTIONS, size: 110 }),
  col.enum("team", { header: "Team", size: 120 }), // facet, from the data: no options needed
  col.currency("mrr", { header: "MRR", currency: "USD", size: 120 }), // number range
  col.boolean("active", { header: "Active", size: 90 }), // yes, no or any
  col.date("joinedAt", { header: "Joined", size: 130 }), // date range
  col.text("notes", { header: "Notes", filter: false, size: 200 }), // no filter
]);

const data = makePeople(120, 13);

/** Every filter kind on one grid, with a facet filter already applied. Hover a header for the funnel. */
export default function DataGridFiltering() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      selection={false}
      initialState={{ columnFilters: [{ id: "status", value: ["active", "invited"] }] }}
    />
  );
}
