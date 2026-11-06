import type { Page } from "@playwright/test";

import { expect, rows, test } from "./fixtures";

/*
 * Seats is editable (number, `min: 1`) and never part of the demo's sort, so the edited row stays
 * where it is. Note: the grid passes `min`/`max` to the <input> but only runs an editor's own
 * `validate`; a value below `min` is committed as typed, so there is no "invalid keeps the editor
 * open" case to test here until a `validate` lands on the demo column.
 */
const seats = (page: Page) => rows(page).first().locator('td[data-column-id="seats"]');
const editor = (page: Page) => page.locator("td[data-editing] input");
/** "<row index>/<column id>" of the cell that has DOM focus. */
const activeCell = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    const td = el?.closest("td");
    return td
      ? `${td.closest("tr")?.getAttribute("data-index")}/${td.getAttribute("data-column-id")}`
      : null;
  });

test.describe("inline editing", () => {
  test("double-click opens an editor and Enter commits, moving down", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await expect(seats(page)).toHaveAttribute("data-editable", "true");
    await seats(page).dblclick();
    await expect(editor(page)).toBeVisible();
    await expect(editor(page)).toHaveAttribute("type", "number");
    await expect(editor(page)).toHaveAttribute("min", "1");
    await editor(page).fill("77");
    await editor(page).press("Enter");
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
    await expect(seats(page)).toHaveText("77");
    // Enter moves the focus down a row, spreadsheet-style.
    await expect.poll(() => activeCell(page)).toBe("1/seats");
  });

  // Component bug (see the e2e report): when a commit changes the data, the grid's focused-cell
  // state is reset (no cell carries data-focused) even though DOM focus moved to the cell below,
  // so the next arrow key jumps to the first cell of the grid. Committing an unchanged value keeps it.
  test("after a committing Enter the cell below is the focused cell and arrows continue from it", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    await seats(page).dblclick();
    await editor(page).fill("77");
    await editor(page).press("Enter");
    await expect(page.locator("tr[data-index='1'] td[data-focused]")).toHaveAttribute(
      "data-column-id",
      "seats",
    );
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("tr[data-index='2'] td[data-focused]")).toHaveAttribute(
      "data-column-id",
      "seats",
    );
  });

  test("Escape cancels and keeps the old value", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const before = (await seats(page).innerText()).trim();
    await seats(page).dblclick();
    await editor(page).fill("55");
    await editor(page).press("Escape");
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
    await expect(seats(page)).toHaveText(before);
  });

  test("Tab commits and moves to the next cell", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await seats(page).dblclick();
    await editor(page).fill("12");
    await editor(page).press("Tab");
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
    await expect(seats(page)).toHaveText("12");
    await expect.poll(() => activeCell(page)).toBe("0/usage");
  });

  test("Enter on an unchanged value closes the editor and keeps the focused cell", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const cell = rows(page).nth(3).locator('td[data-column-id="seats"]');
    await cell.dblclick();
    await expect(editor(page)).toBeVisible();
    await editor(page).press("Enter");
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
    await expect(page.locator("tr[data-index='4'] td[data-focused]")).toHaveAttribute(
      "data-column-id",
      "seats",
    );
  });

  test("Enter on a focused text cell starts editing and commits the new text", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const name = rows(page).first().locator('td[data-column-id="name"]');
    await name.click();
    await expect(name).toHaveAttribute("data-focused", "true");
    await page.keyboard.press("Enter");
    await expect(editor(page)).toBeVisible();
    await editor(page).fill("Edited Person");
    await editor(page).press("Enter");
    await expect(name).toHaveText("Edited Person");
  });

  test("an enum cell edits through a select", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const status = rows(page).first().locator('td[data-column-id="status"]');
    await status.dblclick();
    await page.getByRole("option", { name: "Paused" }).click();
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
    await expect(status).toHaveText("Paused");
  });

  test("a read-only cell does not open an editor", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const email = rows(page).first().locator('td[data-column-id="email"]');
    await expect(email).toHaveAttribute("aria-readonly", "true");
    await email.dblclick();
    await expect(page.locator("td[data-editing]")).toHaveCount(0);
  });
});
