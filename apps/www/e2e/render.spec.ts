import { cells, expect, header, pager, rows, sortButton, test } from "./fixtures";

test.describe("rendering and accessibility", () => {
  test(
    "the kitchen-sink grid renders a page of rows with grid semantics",
    { tag: "@mobile" },
    async ({ openDemo }) => {
      const page = await openDemo("grid");
      const grid = page.getByRole("grid");
      await expect(grid).toBeVisible();
      // 500 data rows plus the header row.
      await expect(grid).toHaveAttribute("aria-rowcount", "501");
      await expect(grid).toHaveAttribute("aria-multiselectable", "true");
      await expect(rows(page)).toHaveCount(10);
      expect(await page.getByRole("columnheader").count()).toBeGreaterThanOrEqual(15);
      await expect(rows(page).first().getByRole("gridcell").first()).toBeVisible();
      await expect(cells(page, "name").first()).not.toBeEmpty();
      await expect(pager(page)).toContainText("Page 1 of 50");
      await expect(pager(page)).toContainText("0 of 500 row(s) selected.");
    },
  );

  test("sortable headers announce their sort state", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const name = header(page, "name");
    await expect(name).toHaveRole("columnheader");
    await expect(name).toHaveAttribute("aria-sort", "none");
    await sortButton(page, "name").click();
    await expect(name).toHaveAttribute("aria-sort", "ascending");
    await sortButton(page, "name").click();
    await expect(name).toHaveAttribute("aria-sort", "descending");
    // Every other sortable header still says "none".
    await expect(header(page, "team")).toHaveAttribute("aria-sort", "none");
  });

  test(
    "the basic demo renders ten rows and link cells",
    { tag: "@mobile" },
    async ({ openDemo }) => {
      const page = await openDemo("basic");
      await expect(page.getByRole("grid")).toBeVisible();
      await expect(rows(page)).toHaveCount(10);
      await expect(cells(page, "email").first().getByRole("link")).toHaveAttribute(
        "href",
        /^mailto:/,
      );
    },
  );

  test("dark mode renders and stays interactive without errors", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const token = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
      );
    const light = await token();
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect.poll(token).not.toBe(light);
    await expect(rows(page)).toHaveCount(10);
    await sortButton(page, "name").click();
    await expect(header(page, "name")).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: "Density" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Compact" })).toBeVisible();
    await page.keyboard.press("Escape");
    // The auto fixture fails the test if anything was logged as an error along the way.
  });
});
