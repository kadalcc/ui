import * as React from "react";

/** Moves one item of an array to a new index and returns the new array. */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** `true` when `value` is a plain object (not an array, Date, Map, etc.). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

/** A value, debounced: updates settle `delay` ms after the last change. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** A controlled/uncontrolled state pair, the way every shadcn component does it. */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [inner, setInner] = React.useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : inner;
  const currentRef = React.useRef(current);
  currentRef.current = current;
  const set = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(currentRef.current) : next;
      if (!isControlled) setInner(resolved);
      onChange?.(resolved);
    },
    [isControlled, onChange],
  );
  return [current, set];
}

/**
 * Nearest scrollable ancestor (an app shell's `<main overflow-y-auto>`), or null for the viewport.
 */
export function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * The height that fills the space from the element's top edge to its scroll parent's bottom edge
 * (minus that parent's bottom padding), clamped to `min`. Re-measured on resize and on layout
 * shifts. Lets a grid fit a console page exactly, with rows scrolling inside the grid instead of
 * the page scrolling twice.
 */
export function useFillHeight(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  min = 240,
): number | undefined {
  const [height, setHeight] = React.useState<number | undefined>(undefined);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setHeight(undefined);
      return;
    }
    const scrollParent = findScrollParent(el);
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      let bottomLimit = window.innerHeight;
      let scrollTop = 0;
      if (scrollParent) {
        const rect = scrollParent.getBoundingClientRect();
        const padBottom = Number.parseFloat(getComputedStyle(scrollParent).paddingBottom) || 0;
        bottomLimit = rect.bottom - padBottom;
        scrollTop = scrollParent.scrollTop;
      }
      setHeight(Math.max(min, Math.floor(bottomLimit - top - scrollTop)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    if (scrollParent) observer.observe(scrollParent);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, enabled, min]);
  return height;
}

/** The element's rendered width, live (ResizeObserver). */
export function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** `true` when the event carries the platform's "command" modifier (⌘ on macOS, Ctrl elsewhere). */
export function isCommandKey(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.metaKey || event.ctrlKey;
}

/** "firstName" → "First name"; "created_at" → "Created at"; "ID" stays "ID". */
export function humanize(id: string): string {
  if (!id) return id;
  const spaced = id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim();
  if (spaced === spaced.toUpperCase()) return spaced;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Stable, SSR-safe id for aria wiring. */
export function useStableId(prefix: string): string {
  const id = React.useId();
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Runs `fn` when the component unmounts; the latest `fn` is used. */
export function useUnmount(fn: () => void): void {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => () => ref.current(), []);
}

/** `matchMedia("(pointer: coarse)")`, for touch targets; false on the server. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}
