import { bulkActions, expect, pager, rows, test } from "./fixtures";

const selectedRows = (page: import("@playwright/test").Page) =>
  page.locator("tbody tr[data-state=selected]");

test.describe("row selection", () => {
  test("a checkbox selects a row, Shift+click a range, and the bulk bar clears them", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const boxes = rows(page).getByRole("checkbox", { name: "Select row" });
    await expect(boxes).toHaveCount(10);
    await expect(bulkActions(page)).toHaveCount(0);

    await boxes.nth(0).click();
    await expect(selectedRows(page)).toHaveCount(1);
    await expect(rows(page).nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(bulkActions(page)).toBeVisible();
    await expect(bulkActions(page)).toContainText("1 selected");
    // The demo's own actions render inside the bar.
    await expect(bulkActions(page).getByRole("button", { name: "Delete" })).toBeVisible();

    await boxes.nth(3).click({ modifiers: ["Shift"] });
    await expect(selectedRows(page)).toHaveCount(4);
    await expect(bulkActions(page)).toContainText("4 selected");
    await expect(pager(page)).toContainText("4 of 500 row(s) selected.");

    await bulkActions(page).getByRole("button", { name: "Clear selection" }).click();
    await expect(bulkActions(page)).toHaveCount(0);
    await expect(selectedRows(page)).toHaveCount(0);
    await expect(pager(page)).toContainText("0 of 500 row(s) selected.");
  });

  test("the header checkbox selects the page and reflects a partial selection", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const all = page.getByRole("checkbox", { name: "Select all" });
    // `force`: the checkbox sits inside the header's drag handle, which carries aria-disabled (see
    // the fixme below), so Playwright's actionability check would otherwise refuse to click it.
    await all.click({ force: true });
    await expect(selectedRows(page)).toHaveCount(10);
    await expect(all).toBeChecked();
    await expect(pager(page)).toContainText("10 of 500 row(s) selected.");
    await expect(bulkActions(page)).toContainText("10 selected");

    await rows(page).getByRole("checkbox", { name: "Select row" }).first().click();
    await expect(selectedRows(page)).toHaveCount(9);
    await expect(all).toHaveAttribute("aria-checked", "mixed");

    await all.click({ force: true });
    await expect(selectedRows(page)).toHaveCount(10);
    await all.click({ force: true });
    await expect(selectedRows(page)).toHaveCount(0);
    await expect(bulkActions(page)).toHaveCount(0);
  });

  // Component bug (see the e2e report): the non-draggable select header still gets dnd-kit's handle
  // attributes, so the "Select all" checkbox is nested in a <div role="button" aria-disabled="true">
  // and reads as disabled to assistive tech (and to Playwright's actionability checks).
  test("the header checkbox is an enabled control in its own right", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const all = page.getByRole("checkbox", { name: "Select all" });
    await expect(all).toBeEnabled();
    await all.click();
    await expect(selectedRows(page)).toHaveCount(10);
  });

  test("a bulk action acts on the selected rows", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const boxes = rows(page).getByRole("checkbox", { name: "Select row" });
    const [first, second] = await rows(page).locator('td[data-column-id="email"]').allInnerTexts();
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await expect(bulkActions(page)).toContainText("2 selected");
    await bulkActions(page).getByRole("button", { name: "Delete" }).click();
    await expect(pager(page)).toContainText("of 498 row");
    const emails = await rows(page).locator('td[data-column-id="email"]').allInnerTexts();
    expect(emails).not.toContain(first);
    expect(emails).not.toContain(second);
    await expect(selectedRows(page)).toHaveCount(0);
  });

  // Component bug (see the e2e report): the selected count comes from the keys of the row-selection
  // state, so rows removed from `data` while selected keep being counted. After the bulk Delete the
  // bar still says "2 selected" and the pager "2 of 498 row(s) selected." with no selected row left.
  test("removing the selected rows empties the selection count", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const boxes = rows(page).getByRole("checkbox", { name: "Select row" });
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await bulkActions(page).getByRole("button", { name: "Delete" }).click();
    await expect(pager(page)).toContainText("0 of 498 row(s) selected.");
    await expect(bulkActions(page)).toHaveCount(0);
  });
});
