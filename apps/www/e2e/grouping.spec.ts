import { expect, openColumnMenu, rows, test } from "./fixtures";

const groupRows = (page: import("@playwright/test").Page) => page.locator("tbody tr[data-grouped]");
const groupingBar = (page: import("@playwright/test").Page) =>
  page.locator("[data-slot=data-grid-grouping-bar]");

test.describe("grouping", () => {
  test("group by Team from the toolbar, expand a group, read aggregates, ungroup from the chip", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    await page.getByRole("button", { name: /^Group/ }).click();
    await page.getByRole("menuitemcheckbox", { name: /^Team/ }).click();
    await page.keyboard.press("Escape");

    // Eight teams in the data: eight group rows, all collapsed.
    await expect(groupRows(page)).toHaveCount(8);
    await expect(rows(page)).toHaveCount(8);
    await expect(groupingBar(page)).toContainText("Grouped by");
    await expect(groupingBar(page)).toContainText("Team");

    const first = groupRows(page).first();
    await expect(first.locator('td[data-column-id="team"]')).toHaveText(/\(\d+\)$/);
    // Aggregates are formatted like their column: MRR sums as currency, seats as a plain number.
    await expect(first.locator('td[data-column-id="mrr"]')).toHaveText(/^\$[\d,]+(\.\d{2})?$/);
    await expect(first.locator('td[data-column-id="seats"]')).toHaveText(/^[\d,]+$/);
    await expect(first).toHaveAttribute("aria-expanded", "false");

    await first.getByRole("button", { name: "Expand" }).click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    const leaves = page.locator('tbody tr[aria-level="2"]');
    await expect(leaves.first()).toBeVisible();
    expect(await rows(page).count()).toBeGreaterThan(8);
    // Under a group the grouped column's cells are placeholders: the value is on the group row.
    const teamName = (await first.locator('td[data-column-id="team"]').innerText())
      .replace(/\s*\(\d+\)\s*$/, "")
      .trim();
    const leafTeams = await leaves.locator('td[data-column-id="team"]').allInnerTexts();
    expect(leafTeams.length).toBeGreaterThan(0);
    expect(leafTeams.every((t) => t.trim() === "" || t.trim() === teamName)).toBe(true);
    await expect(leaves.first().locator('td[data-column-id="name"]')).not.toBeEmpty();

    await groupingBar(page).getByRole("button", { name: "Ungroup: Team" }).click();
    await expect(groupRows(page)).toHaveCount(0);
    await expect(groupingBar(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
  });

  test("group from a column menu and clear from the Group menu", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const menu = await openColumnMenu(page, "plan");
    await menu.getByRole("menuitem", { name: "Group by Plan" }).click();
    // Four plans.
    await expect(groupRows(page)).toHaveCount(4);
    await expect(groupingBar(page)).toContainText("Plan");

    await page.getByRole("button", { name: /^Group/ }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: /^Plan/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("menuitem", { name: "Clear grouping" }).click();
    await expect(groupRows(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
  });
});
