import type { Page } from "@playwright/test";

import { announcer, expect, rows, test } from "./fixtures";

const focused = (page: Page) => page.locator("td[data-focused]");
const focusedAt = (page: Page, rowIndex: number) =>
  page.locator(`tbody tr[data-index="${rowIndex}"] td[data-focused]`);
const selected = (page: Page) => page.locator("td[data-selected]");

test.describe("keyboard navigation", () => {
  test("arrows move the focused cell and Shift+arrows grow a range", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await rows(page).first().locator('td[data-column-id="team"]').click();
    await expect(focusedAt(page, 0)).toHaveAttribute("data-column-id", "team");

    await page.keyboard.press("ArrowDown");
    await expect(focusedAt(page, 1)).toHaveAttribute("data-column-id", "team");
    await page.keyboard.press("ArrowRight");
    await expect(focusedAt(page, 1)).toHaveAttribute("data-column-id", "role");
    await expect(focused(page)).toHaveCount(1);

    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(selected(page)).toHaveCount(4);
    for (const [row, column] of [
      [1, "role"],
      [1, "mrr"],
      [2, "role"],
      [2, "mrr"],
    ] as const) {
      await expect(
        page.locator(`tbody tr[data-index="${row}"] td[data-column-id="${column}"]`),
      ).toHaveAttribute("data-selected", "true");
    }

    // Escape collapses the range back to the focused cell.
    await page.keyboard.press("Escape");
    await expect.poll(() => selected(page).count()).toBeLessThanOrEqual(1);
    await expect(focused(page)).toHaveCount(1);
  });

  test("Home/End jump across the row; with Ctrl/Cmd across the grid", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await rows(page).first().locator('td[data-column-id="team"]').click();
    await page.keyboard.press("Home");
    await expect(focusedAt(page, 0)).toHaveAttribute("data-column-id", "name");
    await page.keyboard.press("End");
    // The last data column: the actions column is a utility column and is skipped.
    await expect(focusedAt(page, 0)).toHaveAttribute("data-column-id", "notes");

    await page.keyboard.press("ControlOrMeta+End");
    await expect(focusedAt(page, 9)).toHaveAttribute("data-column-id", "notes");
    await page.keyboard.press("ControlOrMeta+Home");
    await expect(focusedAt(page, 0)).toHaveAttribute("data-column-id", "name");
  });

  test("PageDown and PageUp move by a screen", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await rows(page).first().locator('td[data-column-id="name"]').click();
    await page.keyboard.press("PageDown");
    const index = await focused(page).evaluate((td) =>
      Number(td.closest("tr")?.getAttribute("data-index")),
    );
    expect(index).toBeGreaterThan(0);
    await expect(focused(page)).toHaveAttribute("data-column-id", "name");
    await page.keyboard.press("PageUp");
    await expect(focusedAt(page, 0)).toHaveAttribute("data-column-id", "name");
  });

  test("Ctrl/Cmd+A selects every cell on the page", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await rows(page).first().locator('td[data-column-id="name"]').click();
    await page.keyboard.press("ControlOrMeta+a");
    // Ten rows of fifteen data columns, give or take the utility columns.
    await expect.poll(() => selected(page).count()).toBeGreaterThanOrEqual(100);
    await expect(announcer(page)).toContainText(/\d+ selected/);
  });

  test("Ctrl/Cmd+C copies the range as tab-separated text", async ({ openDemo, browserName }) => {
    test.skip(browserName !== "chromium", "only Chromium grants clipboard-read to the test");
    const page = await openDemo("grid");
    await rows(page).nth(1).locator('td[data-column-id="team"]').click();
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(selected(page)).toHaveCount(4);
    await page.keyboard.press("ControlOrMeta+c");
    await expect(announcer(page)).toContainText("Copied 4 cells");

    const text = await page.evaluate(() => navigator.clipboard.readText());
    const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
    expect(lines).toHaveLength(2);
    const team = (await rows(page).nth(1).locator('td[data-column-id="team"]').innerText()).trim();
    const role = (await rows(page).nth(1).locator('td[data-column-id="role"]').innerText()).trim();
    expect(lines[0]).toBe(`${team}\t${role}`);
    expect(lines[1]!.split("\t")).toHaveLength(2);
  });

  test("Space toggles the focused row's selection", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await rows(page).first().locator('td[data-column-id="name"]').click();
    await page.keyboard.press("Space");
    await expect(rows(page).first()).toHaveAttribute("data-state", "selected");
    await page.keyboard.press("Space");
    await expect(rows(page).first()).not.toHaveAttribute("data-state", "selected");
  });
});
