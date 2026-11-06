import { expect, pager, rows, test } from "./fixtures";

test.describe("URL state demo", () => {
  test("search and page are written to the URL and survive a reload", async ({ openDemo }) => {
    const page = await openDemo("url-state");
    await page.getByRole("searchbox").fill("an");
    await expect.poll(() => page.url()).toContain("people.q=an");

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect.poll(() => page.url()).toContain("people.page=2");
    await expect(pager(page)).toContainText("Page 2 of");

    await page.reload();
    await expect(rows(page).first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue("an");
    await expect(pager(page)).toContainText("Page 2 of");
  });

  test("a URL with state opens the grid in that state", async ({ page }) => {
    await page.goto("/dev/url-state/?people.q=design");
    await expect(rows(page).first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue("design");
    // Ranked fuzzy search: the best matches, the Design team, come first.
    await expect(rows(page).first().locator('td[data-column-id="team"]')).toHaveText("Design");
    await expect(pager(page)).not.toContainText("of 500 row");
  });
});
