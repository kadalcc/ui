"use client";

import * as React from "react";

import { Button } from "@/registry/kadal/ui/button";
import { ButtonGroup } from "@/registry/kadal/ui/button-group";
import { DataGrid, createDataGridColumns } from "@/registry/kadal/ui/data-grid";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const rows = makePeople(30, 41);

type State = "ready" | "refetching" | "loading" | "error" | "empty";

const STATES: ReadonlyArray<[State, string]> = [
  ["ready", "Loaded"],
  ["refetching", "Refetching"],
  ["loading", "First load"],
  ["error", "Error"],
  ["empty", "Empty"],
];

/** One grid, five states. Refetching keeps the rows under a progress bar; a first load has none yet. */
export default function DataGridStates() {
  const [state, setState] = React.useState<State>("ready");
  const data = state === "loading" || state === "empty" ? [] : rows;
  return (
    <div className="flex flex-col gap-3">
      <ButtonGroup aria-label="Grid state">
        {STATES.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={state === value ? "default" : "outline"}
            onClick={() => setState(value)}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
      <DataGrid
        key="states"
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        loading={state === "loading" || state === "refetching"}
        error={state === "error" ? "The request timed out after 30 seconds." : null}
        onRetry={() => setState("ready")}
        height={360}
      />
    </div>
  );
}
