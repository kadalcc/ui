import { columnOrder, expect, header, sortButton, test } from "./fixtures";

/** `order` with the positions of two ids exchanged. */
const swapped = (order: string[], a: string, b: string): string[] => {
  const next = [...order];
  const ia = next.indexOf(a);
  const ib = next.indexOf(b);
  next[ia] = b;
  next[ib] = a;
  return next;
};

test.describe("column drag and resize", () => {
  test("dragging a header onto another reorders the columns", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const before = await columnOrder(page);
    expect(before.indexOf("role")).toBeGreaterThan(before.indexOf("team"));

    // The title button is the drag handle; a small first move starts the drag, then travel to the target.
    const from = (await sortButton(page, "role").boundingBox())!;
    const to = (await header(page, "team").boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
    await page.mouse.move(to.x + 10, to.y + to.height / 2, { steps: 12 });
    await page.waitForTimeout(150);
    await page.mouse.up();

    // The drop animation keeps a clone in the header for a moment; poll for the settled order.
    const after = swapped(before, "team", "role");
    await expect.poll(() => columnOrder(page)).toEqual(after);
    // The body follows the header.
    const firstRowOrder = await page
      .locator("tbody tr[data-row-id]")
      .first()
      .locator("td[data-column-id]")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.columnId));
    expect(firstRowOrder).toEqual(after);
  });

  test("dragging the separator resizes a column and the body follows", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const th = header(page, "country");
    const handle = th.getByRole("separator");
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    const before = (await th.boundingBox())!.width;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const widened = (await th.boundingBox())!.width;
    expect(widened).toBeGreaterThan(before + 40);
    const cellWidth = await page
      .locator('tbody tr[data-row-id] td[data-column-id="country"]')
      .first()
      .evaluate((td) => td.getBoundingClientRect().width);
    expect(Math.abs(cellWidth - widened)).toBeLessThan(2);

    // Narrowing works the same way.
    const box2 = (await handle.boundingBox())!;
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.mouse.move(box2.x - 120, box2.y + box2.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await th.boundingBox())!.width).toBeLessThan(widened - 80);
  });

  // Component bug (see the e2e report): double-click on the separator calls the same autosize as
  // "Fit to content", which measures the header wrapper and so never shrinks a column.
  test("double-clicking the separator fits a widened column back to its content", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const th = header(page, "country");
    const handle = th.getByRole("separator");
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const widened = (await th.boundingBox())!.width;
    await handle.dblclick();
    await expect.poll(async () => (await th.boundingBox())!.width).toBeLessThan(widened - 50);
  });
});
