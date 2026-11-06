import { expect, header, pager, rows, sortButton, test } from "./fixtures";

test.describe("server-side demo", () => {
  test("paging shows a progress bar while the fetch is in flight", async ({ openDemo }) => {
    const page = await openDemo("server");
    const progress = page.getByRole("progressbar");
    await expect(progress).toHaveCount(0);
    await expect(pager(page)).toContainText("Page 1 of 250");
    await expect(rows(page)).toHaveCount(20);

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(progress).toBeVisible();
    await expect(page.getByRole("grid")).toHaveAttribute("aria-busy", "true");
    await expect(progress).toHaveCount(0, { timeout: 10_000 });
    await expect(pager(page)).toContainText("Page 2 of 250");
    await expect(rows(page)).toHaveCount(20);
  });

  test("sorting triggers a refetch and the server returns sorted rows", async ({ openDemo }) => {
    const page = await openDemo("server");
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    // Numeric columns sort descending first.
    await sortButton(page, "mrr").click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(header(page, "mrr")).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 10_000 });
    const values = (await rows(page).locator('td[data-column-id="mrr"]').allInnerTexts()).map((t) =>
      Number(t.replace(/[^0-9.-]/g, "")),
    );
    expect(values).toHaveLength(20);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(values[0]).toBeGreaterThan(values[values.length - 1]!);
  });

  test("searching refetches and the pager reflects the server's total", async ({ openDemo }) => {
    const page = await openDemo("server");
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page.getByRole("searchbox").fill("design");
    await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 10_000 });
    await expect(pager(page)).not.toContainText("of 250");
    await expect(rows(page).first()).toBeVisible();
  });
});
