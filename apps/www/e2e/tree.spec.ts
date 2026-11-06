import { expect, rows, test } from "./fixtures";

test.describe("tree demo", () => {
  test("expanding a parent adds its children; selecting a parent selects them", async ({
    openDemo,
  }) => {
    const page = await openDemo("tree");
    const before = await rows(page).count();
    expect(before).toBeGreaterThan(0);

    const collapsed = page.locator('tbody tr[data-row-id] button[aria-expanded="false"]').first();
    const parent = collapsed.locator("xpath=ancestor::tr[1]");
    const parentId = await parent.getAttribute("data-row-id");
    await collapsed.click();
    await expect(page.locator(`tbody tr[data-row-id="${parentId}"]`)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect.poll(() => rows(page).count()).toBeGreaterThan(before);
    await expect(page.locator('tbody tr[aria-level="2"]').first()).toBeVisible();

    // The first row is a parent the demo expands by default; its checkbox selects the subtree.
    await expect(rows(page).first()).toHaveAttribute("aria-expanded", "true");
    await rows(page).first().getByRole("checkbox", { name: "Select row" }).click();
    expect(await page.locator("tbody tr[data-state=selected]").count()).toBeGreaterThanOrEqual(2);
    await expect(
      page.locator('tbody tr[aria-level="2"][data-state=selected]').first(),
    ).toBeVisible();
  });

  test("collapsing a parent removes its children again", async ({ openDemo }) => {
    const page = await openDemo("tree");
    const first = rows(page).first();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    const before = await rows(page).count();
    await first.getByRole("button", { name: "Collapse" }).click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => rows(page).count()).toBeLessThan(before);
  });
});
