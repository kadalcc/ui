import { expect, rows, test } from "./fixtures";

test.describe("virtualized demo (50,000 rows)", () => {
  test("only the rows in view are in the DOM and scrolling far renders deep rows", async ({
    openDemo,
  }) => {
    const page = await openDemo("virtualized");
    const rendered = await rows(page).count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThanOrEqual(60);
    await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "50001");
    await expect(rows(page).first()).toHaveAttribute("data-index", "0");

    const scroller = page.getByRole("grid");
    for (let i = 1; i <= 10; i++) {
      await scroller.evaluate((el, y) => {
        el.scrollTop = y;
      }, i * 80_000);
      await page.waitForTimeout(60);
    }
    await expect
      .poll(async () => Number(await rows(page).last().getAttribute("data-index")))
      .toBeGreaterThan(10_000);
    expect(await rows(page).count()).toBeLessThanOrEqual(60);
  });

  test("Ctrl/Cmd+End focuses a cell in the last row", async ({ openDemo }) => {
    const page = await openDemo("virtualized");
    await page.locator("tbody tr[data-row-id] td").nth(3).click();
    await expect(page.locator("td[data-focused]")).toHaveCount(1);
    await page.keyboard.press("End");
    await page.keyboard.press("ControlOrMeta+End");
    await expect(page.locator("td[data-focused]")).toHaveCount(1);
    await expect(page.locator('tbody tr[data-index="49999"] td[data-focused]')).toHaveCount(1);
  });
});
