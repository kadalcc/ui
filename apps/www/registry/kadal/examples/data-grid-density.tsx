"use client";

import * as React from "react";
import { Rows2Icon, Rows3Icon, Rows4Icon } from "lucide-react";

import {
  DataGrid,
  createDataGridColumns,
  type DataGridDensity,
} from "@/registry/kadal/ui/data-grid";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kadal/ui/toggle-group";

import { makePeople, STATUS_OPTIONS, type Person } from "@/registry/kadal/lib/data-grid-demo-data";

const col = createDataGridColumns<Person>();

const columns = col.columns([
  col.text("name", { header: "Name" }),
  col.text("email", { header: "Email", size: 240 }),
  col.enum("status", { header: "Status", options: STATUS_OPTIONS }),
  col.text("team", { header: "Team" }),
  col.currency("mrr", { header: "MRR", currency: "USD" }),
]);

const data = makePeople(40, 37);

/** Density owned by the page: this toggle and the toolbar's density menu change the same state. */
export default function DataGridDensity() {
  const [density, setDensity] = React.useState<DataGridDensity>("compact");
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[density]}
        onValueChange={([next]) => {
          if (next) setDensity(next as DataGridDensity);
        }}
        variant="outline"
        size="sm"
        aria-label="Row density"
      >
        <ToggleGroupItem value="compact">
          <Rows4Icon /> Compact
        </ToggleGroupItem>
        <ToggleGroupItem value="comfortable">
          <Rows3Icon /> Comfortable
        </ToggleGroupItem>
        <ToggleGroupItem value="spacious">
          <Rows2Icon /> Spacious
        </ToggleGroupItem>
      </ToggleGroup>
      <DataGrid
        name="density"
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        density={density}
        onDensityChange={setDensity}
      />
    </div>
  );
}
