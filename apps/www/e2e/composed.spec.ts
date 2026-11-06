import { expect, pager, rows, test } from "./fixtures";

test.describe("composed demo", () => {
  test("the custom layout renders the search, the pager above the table and a footer total", async ({
    openDemo,
  }) => {
    const page = await openDemo("composed");
    const search = page.getByRole("searchbox");
    await expect(search).toBeVisible();
    await expect(page.locator("tfoot")).toContainText("Σ");
    // In this layout the pager sits above the table.
    const pagerBox = (await pager(page).boundingBox())!;
    const tableBox = (await page.locator("[data-slot=data-grid-table]").boundingBox())!;
    expect(pagerBox.y).toBeLessThan(tableBox.y);

    const total = (await page.locator("tfoot").innerText()).trim();
    const allRows = (await pager(page).innerText()).match(/of (\d+) row/)?.[1];
    await search.fill("design");
    // The search is fuzzy and ranked: the Design team comes first, looser matches may follow.
    await expect(rows(page).first().locator('td[data-column-id="team"]')).toHaveText("Design");
    await expect(pager(page)).not.toContainText(`of ${allRows} row`);
    // The footer sums the filtered rows, so it changes with the search.
    await expect(page.locator("tfoot")).not.toHaveText(total);
    await expect(page.locator("tfoot")).toContainText("Σ");
  });
});
