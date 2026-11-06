import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** The demo pages src/pages/dev/[demo].astro renders, one bare grid each. */
export type DemoName =
  | "grid"
  | "basic"
  | "virtualized"
  | "tree"
  | "server"
  | "composed"
  | "url-state";

/** Console noise that is not the grid's: Vite's dev-only re-optimisation message. */
const IGNORED_CONSOLE = [/Outdated Optimize Dep/];

interface Fixtures {
  /**
   * Every console.error and uncaught page error seen during the test. Collected automatically and
   * asserted empty at the end, so a test fails on any error it did not expect, not just on the
   * assertion it was making.
   */
  pageProblems: string[];
  /** Opens /dev/<name>/ and waits until the first data row is on screen. */
  openDemo: (name: DemoName, search?: string) => Promise<Page>;
}

export const test = base.extend<Fixtures>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const text = m.text();
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
        problems.push(`[console.error] ${text}`);
      });
      await use(problems);
      expect(problems, "console errors or page errors during the test").toEqual([]);
    },
    { auto: true },
  ],
  openDemo: async ({ page }, use) => {
    await use(async (name, search = "") => {
      await page.goto(`/dev/${name}/${search}`);
      await expect(rows(page).first()).toBeVisible({ timeout: 30_000 });
      return page;
    });
  },
});

export { expect };

// ── Locators shared by the specs ──────────────────────────────────────────────────────────────────

/** The data rows on the current page (group rows included; the header and spacer rows are not). */
export const rows = (page: Page): Locator => page.locator("tbody tr[data-row-id]");

/** A column's header cell, by column id. */
export const header = (page: Page, columnId: string): Locator =>
  page.locator(`thead th[data-column-id="${columnId}"]`);

/** The header's sort button: the first button in the header cell is the title/sort toggle. */
export const sortButton = (page: Page, columnId: string): Locator =>
  header(page, columnId).locator("button").first();

/** A column's body cells on the current page, in display order. */
export const cells = (page: Page, columnId: string): Locator =>
  rows(page).locator(`td[data-column-id="${columnId}"]`);

export const pager = (page: Page): Locator => page.locator("[data-slot=data-grid-pagination]");
export const searchBox = (page: Page): Locator => page.getByRole("searchbox", { name: "Search…" });
export const filterChips = (page: Page): Locator =>
  page.locator("[data-slot=data-grid-filter-chips]");
export const bulkActions = (page: Page): Locator =>
  page.locator("[data-slot=data-grid-bulk-actions]");

/** The toolbar's column-visibility popover trigger: "View", or "View 2 hidden" (not the "Views" menu). */
export const viewButton = (page: Page): Locator =>
  page.getByRole("button", { name: /^View( \d+ hidden)?$/ });

/** The grid's own polite live region (dnd-kit adds another one for drags). */
export const announcer = (page: Page): Locator =>
  page.locator("[data-slot=data-grid] > [aria-live=polite]");

/** Base UI keeps a closing popup in the DOM for its exit animation; `data-open` picks the live one. */
const openMenu = (page: Page): Locator => page.locator('[role="menu"][data-open]');

/** The visible header order, as column ids. */
export const columnOrder = (page: Page): Promise<string[]> =>
  page
    .locator("thead th[data-column-id]")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.columnId ?? ""));

/**
 * Opens a column's "…" menu. The menu button only shows on hover, so hover first; its label is
 * "<Column>: Column menu".
 */
export async function openColumnMenu(page: Page, columnId: string): Promise<Locator> {
  const th = header(page, columnId);
  await th.hover();
  await th.getByRole("button", { name: /: Column menu$/ }).click();
  const menu = openMenu(page);
  await expect(menu).toBeVisible();
  return menu;
}

/** Opens a column's filter popover (the funnel button, "Filter: <Column>"). */
export async function openFilter(page: Page, columnId: string): Promise<Locator> {
  const th = header(page, columnId);
  await th.hover();
  await th.getByRole("button", { name: /^Filter: / }).click();
  const popover = page.locator("[data-slot=data-grid-filter][data-open]");
  await expect(popover).toBeVisible();
  return popover;
}

/** "$1,234.00" → 1234. */
export const money = (text: string): number => Number(text.replace(/[^0-9.-]/g, ""));
