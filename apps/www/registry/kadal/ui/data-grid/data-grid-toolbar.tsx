import * as React from "react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  BookmarkIcon,
  BookmarkPlusIcon,
  CheckIcon,
  CircleXIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  GroupIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  RotateCcwIcon,
  Rows2Icon,
  Rows3Icon,
  Rows4Icon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/registry/kadal/ui/badge";
import { Button } from "@/registry/kadal/ui/button";
import { Checkbox } from "@/registry/kadal/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/kadal/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kadal/ui/dropdown-menu";
import { Input } from "@/registry/kadal/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kadal/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kadal/ui/tooltip";

import { UTILITY_KINDS } from "./data-grid-columns";
import { useDataGridContext, useDataGridUi } from "./data-grid-context";
import { DataGridFilterChips } from "./data-grid-filters";
import type { DataGridDensity } from "./data-grid-types";
import { useDebouncedValue } from "./data-grid-utils";

// ── Search ────────────────────────────────────────────────────────────────────────────────────────

export function DataGridSearch<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const external = (table.state.globalFilter as string | undefined) ?? "";
  const [value, setValue] = React.useState(external);
  const debounced = useDebouncedValue(value, 200);
  // Typing wins while the user types; an outside change (URL, reset) wins otherwise.
  const lastSent = React.useRef(external);
  React.useEffect(() => {
    if (debounced !== lastSent.current) {
      lastSent.current = debounced;
      table.setGlobalFilter(debounced || undefined);
    }
  }, [debounced, table]);
  React.useEffect(() => {
    if (external !== lastSent.current) {
      lastSent.current = external;
      setValue(external);
    }
  }, [external]);
  if (!grid.globalFilterEnabled) return null;
  return (
    <div className={cn("relative w-full max-w-xs", className)} data-slot="data-grid-search">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setValue("");
        }}
        placeholder={labels.search}
        aria-label={labels.search}
        className="h-8 pl-8 pr-8"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label={labels.clearFilters}
          className="absolute top-1/2 right-2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

// ── Columns (visibility, pinning) ─────────────────────────────────────────────────────────────────

export function DataGridViewOptions<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const [query, setQuery] = React.useState("");
  const q = query.toLowerCase();
  const columns = table
    .getAllLeafColumns()
    .filter((c) => c.getCanHide() && !UTILITY_KINDS.has(grid.metaFor(c.id).kind ?? "custom"));
  const hidden = columns.filter((c) => !c.getIsVisible()).length;
  const shown = q ? columns.filter((c) => grid.labelFor(c.id).toLowerCase().includes(q)) : columns;
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className={cn("h-8", className)} />}
      >
        <Settings2Icon /> {labels.view}
        {hidden ? (
          <Badge variant="secondary" className="ml-1 h-4 px-1 font-normal">
            {labels.hidden(hidden)}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-2 p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchColumns}
            aria-label={labels.searchColumns}
            className="h-8 pl-7 text-sm"
          />
        </div>
        <ul className="-mx-1 max-h-64 overflow-y-auto" aria-label={labels.viewColumns}>
          {shown.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              {labels.noColumns}
            </li>
          ) : (
            shown.map((column) => {
              const visible = column.getIsVisible();
              const pinned = column.getIsPinned();
              return (
                <li key={column.id}>
                  <label className="flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
                    <Checkbox
                      checked={visible}
                      onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                      aria-label={grid.labelFor(column.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{grid.labelFor(column.id)}</span>
                    {pinned ? <PinIcon className="size-3 text-muted-foreground" /> : null}
                    {visible ? (
                      <EyeIcon className="size-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOffIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center justify-between border-t pt-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => table.toggleAllColumnsVisible(true)}
            disabled={!hidden}
          >
            <EyeIcon /> {labels.showAll}
          </Button>
          {grid.views.enabled ? (
            <Button variant="ghost" size="xs" onClick={() => grid.views.reset()}>
              <RotateCcwIcon /> {labels.resetView}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                table.resetColumnVisibility();
                table.resetColumnOrder();
                table.resetColumnSizing();
                table.resetColumnPinning();
              }}
            >
              <RotateCcwIcon /> {labels.resetView}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Grouping ──────────────────────────────────────────────────────────────────────────────────────

export function DataGridGroupMenu<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  if (!grid.groupingEnabled) return null;
  const columns = table
    .getAllLeafColumns()
    .filter(
      (c) =>
        c.getCanGroup() &&
        grid.metaFor(c.id).groupable !== false &&
        !UTILITY_KINDS.has(grid.metaFor(c.id).kind ?? "custom"),
    );
  if (!columns.length) return null;
  const grouping = table.state.grouping;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className={cn("h-8", className)} />}
      >
        <GroupIcon /> {labels.group}
        {grouping.length ? (
          <Badge variant="secondary" className="ml-1 h-4 px-1 font-normal">
            {grouping.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.groupedBy}</DropdownMenuLabel>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsGrouped()}
              onCheckedChange={() => column.toggleGrouping()}
              closeOnClick={false}
            >
              {grid.labelFor(column.id)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {grouping.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => table.resetGrouping(true)}>
              <CircleXIcon /> {labels.clearGrouping}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The grouped columns as chips, in grouping order, each removable. */
export function DataGridGroupingBar<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const grouping = table.state.grouping;
  if (!grouping.length) return null;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-slot="data-grid-grouping-bar"
    >
      <span className="text-xs text-muted-foreground">{labels.groupedBy}</span>
      {grouping.map((id) => (
        <Badge key={id} variant="outline" className="h-6 gap-1 pr-1 font-normal">
          <GroupIcon className="size-3" />
          {grid.labelFor(id)}
          <button
            type="button"
            className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
            aria-label={`${labels.ungroup}: ${grid.labelFor(id)}`}
            onClick={() => table.getColumn(id)?.toggleGrouping()}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

// ── Density ───────────────────────────────────────────────────────────────────────────────────────

export function DataGridDensityMenu<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { labels, density, setDensity } = grid;
  const Icon = density === "compact" ? Rows4Icon : density === "spacious" ? Rows2Icon : Rows3Icon;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" className={cn("h-8 w-8", className)} />}
        aria-label={labels.density}
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={density}
          onValueChange={(v) => setDensity(v as DataGridDensity)}
        >
          <DropdownMenuLabel>{labels.density}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="compact">
            <Rows4Icon /> {labels.densityCompact}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="comfortable">
            <Rows3Icon /> {labels.densityComfortable}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="spacious">
            <Rows2Icon /> {labels.densitySpacious}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────────────────────────

export function DataGridExportMenu<TData extends RowData>({
  className,
  filename,
}: {
  className?: string;
  filename?: string;
}) {
  const grid = useDataGridContext<TData>();
  const { table, labels } = grid;
  const ui = useDataGridUi();
  const selectedCount = table.getSelectedRowModel().flatRows.length;
  const [selectedOnly, setSelectedOnly] = React.useState(false);
  const opts = { selectedOnly: selectedOnly && selectedCount > 0 };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" className={cn("h-8 w-8", className)} />}
        aria-label={labels.export}
      >
        <DownloadIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.export}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => grid.exportCsv(filename, opts)}>
            <FileSpreadsheetIcon /> {labels.exportCsv}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => grid.exportJson(filename, opts)}>
            <FileJsonIcon /> {labels.exportJson}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void grid.copyToClipboard(opts).then((ok) => {
                if (ok) ui.announce(labels.copiedRows(grid.exportTable(opts).rows.length));
              })
            }
          >
            <ClipboardCopyIcon /> {labels.exportCopy}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {grid.selectionEnabled ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedOnly}
              onCheckedChange={setSelectedOnly}
              disabled={selectedCount === 0}
              closeOnClick={false}
            >
              {labels.exportSelectedOnly}
              {selectedCount ? (
                <span className="ml-auto text-xs text-muted-foreground">{selectedCount}</span>
              ) : null}
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Saved views ───────────────────────────────────────────────────────────────────────────────────

export function DataGridViewsMenu<TData extends RowData>({ className }: { className?: string }) {
  const grid = useDataGridContext<TData>();
  const { labels, views } = grid;
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  if (!views.savedViewsEnabled) return null;
  const active = views.saved.find((v) => v.id === views.activeId);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className={cn("h-8", className)} />}
        >
          <BookmarkIcon /> {active ? active.name : labels.savedViews}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{labels.savedViews}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => views.reset()}>
              <RotateCcwIcon /> {labels.defaultView}
              {!views.activeId ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
            {views.saved.map((v) => (
              <DropdownMenuItem key={v.id} onClick={() => views.apply(v.id)}>
                <BookmarkIcon /> <span className="truncate">{v.name}</span>
                {views.activeId === v.id ? <CheckIcon className="ml-auto" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setName(active?.name ?? "");
              setSaveOpen(true);
            }}
          >
            <BookmarkPlusIcon /> {labels.saveView}
          </DropdownMenuItem>
          {active ? (
            <DropdownMenuItem variant="destructive" onClick={() => views.remove(active.id)}>
              <Trash2Icon /> {labels.deleteView}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              views.save(name);
              setSaveOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>{labels.saveView.replace(/…$/, "")}</DialogTitle>
              <DialogDescription>{labels.saveViewPrompt}</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label={labels.saveViewPrompt}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
                {labels.cancel}
              </Button>
              <Button type="submit">{labels.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Fullscreen ────────────────────────────────────────────────────────────────────────────────────

export function DataGridFullscreenToggle({ className }: { className?: string }) {
  const { labels } = useDataGridContext();
  const ui = useDataGridUi();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className={cn("h-8 w-8", className)}
            onClick={() => ui.setFullscreen(!ui.fullscreen)}
            aria-label={ui.fullscreen ? labels.exitFullscreen : labels.fullscreen}
            aria-pressed={ui.fullscreen}
          />
        }
      >
        {ui.fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
      </TooltipTrigger>
      <TooltipContent>{ui.fullscreen ? labels.exitFullscreen : labels.fullscreen}</TooltipContent>
    </Tooltip>
  );
}

// ── The toolbar ───────────────────────────────────────────────────────────────────────────────────

export interface DataGridToolbarProps {
  className?: string;
  /** Extra controls after the search (left side). */
  start?: React.ReactNode;
  /** Extra controls before the built-in menus (right side). */
  children?: React.ReactNode;
  search?: boolean;
  filters?: boolean;
  columns?: boolean;
  grouping?: boolean;
  density?: boolean;
  export?: boolean;
  views?: boolean;
  fullscreen?: boolean;
  /** Stem of exported file names. Defaults to the grid key. */
  exportFilename?: string;
}

/** Search, filter chips and the grouping bar on the left; your controls and the menus on the right. */
export function DataGridToolbar<TData extends RowData>({
  className,
  start,
  children,
  search = true,
  filters = true,
  columns = true,
  grouping = true,
  density = true,
  export: exportMenu = true,
  views = true,
  fullscreen = true,
  exportFilename,
}: DataGridToolbarProps) {
  const grid = useDataGridContext<TData>();
  return (
    <div
      data-slot="data-grid-toolbar"
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
    >
      {/* A minimum width for the search side, so on a phone the menus wrap under it instead of over it. */}
      <div className="flex min-w-64 flex-1 flex-wrap items-center gap-2">
        {search ? <DataGridSearch /> : null}
        {start}
        {filters ? <DataGridFilterChips /> : null}
        {grouping ? <DataGridGroupingBar /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {views && grid.views.savedViewsEnabled ? <DataGridViewsMenu /> : null}
        {grouping ? <DataGridGroupMenu /> : null}
        {columns ? <DataGridViewOptions /> : null}
        {density ? <DataGridDensityMenu /> : null}
        {exportMenu ? <DataGridExportMenu filename={exportFilename} /> : null}
        {fullscreen ? <DataGridFullscreenToggle /> : null}
      </div>
    </div>
  );
}
