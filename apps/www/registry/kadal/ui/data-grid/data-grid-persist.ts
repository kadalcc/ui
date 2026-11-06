import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  GroupingState,
  SortingState,
} from "@tanstack/react-table";

import type { DataGridDensity } from "./data-grid-types";

/**
 * The part of a grid's state that is a *preference* rather than a *query*: how the user likes to
 * look at this grid. It survives a refresh (localStorage by default) and can be saved under a name.
 * Filters, search and the page index are deliberately not here: they describe what the user is
 * looking for right now and belong in the URL (see `data-grid-url-state`) or nowhere.
 */
export interface DataGridView {
  sorting: SortingState;
  columnVisibility: ColumnVisibilityState;
  columnPinning: ColumnPinningState;
  columnOrder: ColumnOrderState;
  columnSizing: ColumnSizingState;
  grouping: GroupingState;
  pageSize: number;
  density: DataGridDensity;
}

export interface SavedView {
  id: string;
  name: string;
  view: DataGridView;
  /** ISO timestamp. */
  savedAt: string;
}

export interface PersistedGridState {
  /** Schema version, so a future shape change can migrate or discard safely. */
  v: 1;
  current: DataGridView;
  /** The id of the saved view the current state was last applied from, if any. */
  activeViewId: string | null;
  views: SavedView[];
}

/** Where the state is kept. `localStorage` by default; pass your own to sync to a server. */
export interface DataGridStorage {
  get(key: string): PersistedGridState | null | Promise<PersistedGridState | null>;
  set(key: string, state: PersistedGridState): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}

export const STORAGE_PREFIX = "kadal:data-grid:v1";

export function defaultView(pageSize = 10, density: DataGridDensity = "comfortable"): DataGridView {
  return {
    sorting: [],
    columnVisibility: {},
    columnPinning: { start: [], end: [] },
    columnOrder: [],
    columnSizing: {},
    grouping: [],
    pageSize,
    density,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asStringArray = (v: unknown): string[] =>
  asArray<unknown>(v).filter((x): x is string => typeof x === "string");

/** Accepts whatever is in storage and returns a well-formed view; junk falls back to defaults. */
export function sanitizeView(input: unknown, fallback: DataGridView): DataGridView {
  if (!isRecord(input)) return fallback;
  const pinning = isRecord(input.columnPinning) ? input.columnPinning : {};
  const density = input.density;
  return {
    sorting: asArray<{ id: unknown; desc: unknown }>(input.sorting)
      .filter((s) => isRecord(s) && typeof s.id === "string")
      .map((s) => ({ id: s.id as string, desc: Boolean(s.desc) })),
    columnVisibility: isRecord(input.columnVisibility)
      ? (Object.fromEntries(
          Object.entries(input.columnVisibility).filter(([, v]) => typeof v === "boolean"),
        ) as ColumnVisibilityState)
      : fallback.columnVisibility,
    columnPinning: {
      start: asStringArray(pinning.start),
      end: asStringArray(pinning.end),
    },
    columnOrder: asStringArray(input.columnOrder),
    columnSizing: isRecord(input.columnSizing)
      ? (Object.fromEntries(
          Object.entries(input.columnSizing).filter(
            ([, v]) => typeof v === "number" && Number.isFinite(v),
          ),
        ) as ColumnSizingState)
      : fallback.columnSizing,
    grouping: asStringArray(input.grouping),
    pageSize:
      typeof input.pageSize === "number" && input.pageSize > 0 ? input.pageSize : fallback.pageSize,
    density:
      density === "compact" || density === "comfortable" || density === "spacious"
        ? density
        : fallback.density,
  };
}

export function sanitizeState(input: unknown, fallback: DataGridView): PersistedGridState | null {
  if (!isRecord(input) || input.v !== 1) return null;
  return {
    v: 1,
    current: sanitizeView(input.current, fallback),
    activeViewId: typeof input.activeViewId === "string" ? input.activeViewId : null,
    views: asArray<unknown>(input.views)
      .filter(isRecord)
      .filter((v) => typeof v.id === "string" && typeof v.name === "string")
      .map((v) => ({
        id: v.id as string,
        name: v.name as string,
        view: sanitizeView(v.view, fallback),
        savedAt: typeof v.savedAt === "string" ? v.savedAt : new Date(0).toISOString(),
      })),
  };
}

/** localStorage, guarded: private windows and blocked storage read as "nothing saved". */
export const localStorageStorage: DataGridStorage = {
  get(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PersistedGridState) : null;
    } catch {
      return null;
    }
  },
  set(key, state) {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota or blocked storage: the view simply doesn't persist
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

/** sessionStorage, for a view that should last the tab and no longer. */
export const sessionStorageStorage: DataGridStorage = {
  get(key) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PersistedGridState) : null;
    } catch {
      return null;
    }
  },
  set(key, state) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

/** An in-memory store, for tests and for grids that should never persist. */
export function memoryStorage(): DataGridStorage {
  const map = new Map<string, PersistedGridState>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, state) => void map.set(key, state),
    remove: (key) => void map.delete(key),
  };
}

export const storageKeyFor = (gridKey: string, scope?: string | null) =>
  `${STORAGE_PREFIX}:${scope ?? "anon"}:${gridKey}`;

export function newViewId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}
