import { columnOrder, expect, header, openColumnMenu, test, viewButton } from "./fixtures";

/** `order` with the positions of two ids exchanged. */
const swapped = (order: string[], a: string, b: string): string[] => {
  const next = [...order];
  const ia = next.indexOf(a);
  const ib = next.indexOf(b);
  next[ia] = b;
  next[ib] = a;
  return next;
};

test.describe("column menu", () => {
  test("pins a column to the start, then the end, then unpins it", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const plan = header(page, "plan");
    await expect(plan).not.toHaveAttribute("data-pinned", /.+/);

    let menu = await openColumnMenu(page, "plan");
    await menu.getByRole("menuitem", { name: "Pin to start" }).click();
    await expect(plan).toHaveAttribute("data-pinned", "start");
    let order = await columnOrder(page);
    expect(order.indexOf("plan")).toBeLessThan(order.indexOf("name"));

    menu = await openColumnMenu(page, "plan");
    await expect(menu.getByRole("menuitem", { name: "Pin to start" })).toHaveCount(0);
    await menu.getByRole("menuitem", { name: "Pin to end" }).click();
    await expect(plan).toHaveAttribute("data-pinned", "end");
    order = await columnOrder(page);
    expect(order.indexOf("plan")).toBeGreaterThan(order.indexOf("notes"));

    menu = await openColumnMenu(page, "plan");
    await menu.getByRole("menuitem", { name: "Unpin" }).click();
    await expect(plan).not.toHaveAttribute("data-pinned", /.+/);
    order = await columnOrder(page);
    // Back between Status and Team, where the column definition puts it.
    expect(order.indexOf("plan")).toBe(order.indexOf("status") + 1);
    expect(order.indexOf("plan")).toBe(order.indexOf("team") - 1);
  });

  test("hides a column and the View button counts it", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const before = await columnOrder(page);
    const menu = await openColumnMenu(page, "plan");
    await menu.getByRole("menuitem", { name: "Hide column" }).click();
    await expect(header(page, "plan")).toHaveCount(0);
    expect(await columnOrder(page)).toEqual(before.filter((id) => id !== "plan"));
    await expect(viewButton(page)).toContainText("1 hidden");
  });

  test("moves a column right and back left", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const before = await columnOrder(page);
    expect(before.indexOf("role")).toBe(before.indexOf("team") + 1);

    let menu = await openColumnMenu(page, "team");
    await menu.getByRole("menuitem", { name: "Move right" }).click();
    await expect.poll(() => columnOrder(page)).toEqual(swapped(before, "team", "role"));

    menu = await openColumnMenu(page, "team");
    await menu.getByRole("menuitem", { name: "Move left" }).click();
    await expect.poll(() => columnOrder(page)).toEqual(before);
  });

  test("Fit to content widens a column that was squeezed below its text", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const th = header(page, "country");
    const handle = th.getByRole("separator");
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    const before = (await th.boundingBox())!.width;
    // Squeeze the column well below its text…
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 70, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const squeezed = (await th.boundingBox())!.width;
    expect(squeezed).toBeLessThan(before - 40);
    // …and "Fit to content" grows it again.
    const menu = await openColumnMenu(page, "country");
    await menu.getByRole("menuitem", { name: "Fit to content" }).click();
    await expect.poll(async () => (await th.boundingBox())!.width).toBeGreaterThan(squeezed + 10);
  });

  // Component bug (see the e2e report): autosizeColumn measures `[data-column-id] > *`, and the
  // header's flex wrapper is always as wide as the header itself, so "Fit to content" can only ever
  // grow a column by its padding (130 → 276 by drag → 300 after fit), never shrink it to its text.
  test("Fit to content shrinks a column that was dragged wider than its text", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const th = header(page, "country");
    const handle = th.getByRole("separator");
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    const before = (await th.boundingBox())!.width;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const widened = (await th.boundingBox())!.width;
    expect(widened).toBeGreaterThan(before + 100);
    const menu = await openColumnMenu(page, "country");
    await menu.getByRole("menuitem", { name: "Fit to content" }).click();
    await expect.poll(async () => (await th.boundingBox())!.width).toBeLessThan(widened - 50);
  });
});
