import { cells, expect, pager, rows, searchBox, test } from "./fixtures";

test.describe("search", () => {
  test(
    "fuzzy search narrows the rows and the clear button restores them",
    { tag: "@mobile" },
    async ({ openDemo }) => {
      const page = await openDemo("grid");
      const box = searchBox(page);
      await box.fill("aarav");
      await expect(pager(page)).not.toContainText("of 500 row");
      const names = await cells(page, "name").allInnerTexts();
      expect(names.length).toBeGreaterThan(0);
      // Ranked: exact and prefix matches come before looser ones.
      expect(names[0]).toMatch(/^Aarav/);

      await page
        .locator("[data-slot=data-grid-search]")
        .getByRole("button", { name: "Clear" })
        .click();
      await expect(box).toHaveValue("");
      await expect(pager(page)).toContainText("of 500 row");
      await expect(rows(page)).toHaveCount(10);
    },
  );

  test("a search with no matches shows the empty state, whose Clear button resets it", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    await searchBox(page).fill("zzqqxxzzqqxx");
    await expect(page.getByText("No rows match the current filters.")).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
    // The empty state's button has visible text; the search box's clear is icon-only.
    await page
      .getByRole("button", { name: "Clear", exact: true })
      .filter({ hasText: "Clear" })
      .click();
    await expect(page.getByText("No rows match the current filters.")).toHaveCount(0);
    await expect(searchBox(page)).toHaveValue("");
    await expect(rows(page)).toHaveCount(10);
  });

  test("Escape in the search box clears it", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const box = searchBox(page);
    await box.fill("design");
    await expect(pager(page)).not.toContainText("of 500 row");
    await box.press("Escape");
    await expect(box).toHaveValue("");
    await expect(pager(page)).toContainText("of 500 row");
  });
});
