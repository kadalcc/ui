/**
 * Export the rows the user is looking at (filtered and sorted, visible columns, in order) as CSV,
 * TSV or JSON, download them, or put them on the clipboard. Pure functions: the grid feeds them
 * header labels and already-formatted cell values, so what you export is what you saw.
 */
export interface ExportTable {
  /** Column headers, in display order. */
  headers: string[];
  /** One array per row, cells in the same order as `headers`. */
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
}

/** RFC 4180 quoting: wrap when the cell holds the delimiter, a quote or a line break. */
export function csvCell(value: unknown, delimiter = ","): string {
  if (value === null || value === undefined) return "";
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  const mustQuote =
    text.includes(delimiter) || text.includes('"') || text.includes("\n") || text.includes("\r");
  return mustQuote ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toDelimited(
  table: ExportTable,
  delimiter = ",",
  { headers = true, eol = "\r\n" }: { headers?: boolean; eol?: string } = {},
): string {
  const lines: string[] = [];
  if (headers) lines.push(table.headers.map((h) => csvCell(h, delimiter)).join(delimiter));
  for (const row of table.rows) lines.push(row.map((c) => csvCell(c, delimiter)).join(delimiter));
  return lines.join(eol);
}

export const toCsv = (table: ExportTable, options?: { headers?: boolean }) =>
  toDelimited(table, ",", options);

/** Tab-separated, with `\n` line ends: what spreadsheets paste best. */
export const toTsv = (table: ExportTable, options?: { headers?: boolean }) =>
  toDelimited(table, "\t", { ...options, eol: "\n" });

export function toJson(table: ExportTable, { pretty = true }: { pretty?: boolean } = {}): string {
  const objects = table.rows.map((row) =>
    Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? null])),
  );
  return JSON.stringify(objects, null, pretty ? 2 : undefined);
}

/** Triggers a browser download of `content`. A no-op outside the browser. */
export function downloadFile(filename: string, content: string, mime: string): void {
  if (typeof document === "undefined") return;
  // A BOM lets Excel open UTF-8 CSVs with accents intact.
  const body = mime.startsWith("text/csv") ? `﻿${content}` : content;
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies text to the clipboard, with the `execCommand` fallback for contexts where the async
 * clipboard API is unavailable (http://, some embedded webviews). Resolves `true` on success.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** A filename-safe stem: "Orders · 2026" → "orders-2026". */
export function slugifyFilename(name: string, fallback = "export"): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
