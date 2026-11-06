import type { DataGridColumnMeta } from "./data-grid-types";

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, f);
  }
  return f;
}

function dateFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = dateFormats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(key, f);
  }
  return f;
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The display string for a cell value, by the column's kind and formatting meta. Used by the
 * default cell renderers, the facet filter list, aggregation footers and exports, so they agree.
 */
export function formatValue(
  value: unknown,
  meta: DataGridColumnMeta | undefined,
  row: unknown,
  locale: string | undefined,
  blank = "—",
): string {
  if (meta?.format) return meta.format(value, row);
  if (value === null || value === undefined || value === "") return blank;
  const loc = meta?.locale ?? locale;
  switch (meta?.kind) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return numberFormat(loc, {
        minimumFractionDigits: meta.minimumFractionDigits,
        maximumFractionDigits: meta.maximumFractionDigits ?? 2,
      }).format(n);
    }
    case "currency": {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return numberFormat(loc, {
        style: "currency",
        currency: meta.currency ?? "USD",
        minimumFractionDigits: meta.minimumFractionDigits,
        maximumFractionDigits: meta.maximumFractionDigits,
      }).format(n);
    }
    case "percent": {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return numberFormat(loc, {
        style: "percent",
        minimumFractionDigits: meta.minimumFractionDigits,
        maximumFractionDigits: meta.maximumFractionDigits ?? 1,
      }).format(n);
    }
    case "date": {
      const d = toDate(value);
      return d ? dateFormat(loc, { dateStyle: meta.dateStyle ?? "medium" }).format(d) : blank;
    }
    case "datetime": {
      const d = toDate(value);
      return d
        ? dateFormat(loc, {
            dateStyle: meta.dateStyle ?? "medium",
            timeStyle: meta.timeStyle ?? "short",
          }).format(d)
        : blank;
    }
    case "boolean":
      return value ? "Yes" : "No";
    case "enum": {
      const opt = meta.options?.find((o) => String(o.value) === String(value));
      return opt?.label ?? String(value);
    }
    case "tags": {
      if (!Array.isArray(value)) return String(value);
      if (value.length === 0) return blank;
      return value
        .map((v) => meta.options?.find((o) => String(o.value) === String(v))?.label ?? String(v))
        .join(", ");
    }
    default:
      if (value instanceof Date) {
        return dateFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(value);
      }
      if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : blank;
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return "[object]";
        }
      }
      return String(value);
  }
}

/** For `<input type="date|datetime-local">` values. */
export function toInputDate(value: unknown, withTime: boolean): string {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}
