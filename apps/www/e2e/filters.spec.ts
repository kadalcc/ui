import { cells, expect, filterChips, money, openFilter, pager, test } from "./fixtures";

test.describe("column filters", () => {
  test("a facet filter narrows to the chosen value, shows a chip and clears from it", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const popover = await openFilter(page, "status");
    await expect(popover.getByPlaceholder("Search values…")).toBeVisible();
    const active = popover.getByRole("option", { name: /Active/ });
    await active.getByRole("checkbox").click();
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expect(popover).toContainText("1 applied");
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();

    const chips = filterChips(page);
    await expect(chips).toBeVisible();
    await expect(chips).toContainText("Status");
    await expect(chips).toContainText("Active");
    await expect(pager(page)).not.toContainText("of 500 row");
    const statuses = await cells(page, "status").allInnerTexts();
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((s) => s.trim() === "Active")).toBe(true);

    await chips.getByRole("button", { name: "Clear: Status" }).click();
    await expect(chips).toHaveCount(0);
    await expect(pager(page)).toContainText("of 500 row");
  });

  test("a text filter applies the chosen operator", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const popover = await openFilter(page, "notes");
    await popover.getByRole("textbox", { name: "Filter" }).fill("Wants");
    await expect(filterChips(page)).toContainText("contains “Wants”");
    await popover.getByRole("combobox", { name: "Filter" }).click();
    await page.getByRole("option", { name: "Starts with" }).click();
    await expect(popover.getByRole("combobox", { name: "Filter" })).toContainText("Starts with");
    await page.keyboard.press("Escape");
    await expect(filterChips(page)).toContainText("Notes");
    await expect(filterChips(page)).toContainText("starts with “Wants”");
    const notes = await cells(page, "notes").allInnerTexts();
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.trim().startsWith("Wants"))).toBe(true);

    // "Is empty" needs no value: the input goes away and the chip says so.
    await openFilter(page, "notes");
    await popover.getByRole("combobox", { name: "Filter" }).click();
    await page.getByRole("option", { name: "Is empty" }).click();
    await expect(popover.getByRole("textbox", { name: "Filter" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(filterChips(page)).toContainText("is empty");
    await expect(pager(page)).not.toContainText("of 500 row");
    expect(
      (await cells(page, "notes").allInnerTexts()).every(
        (n) => n.trim() === "" || n.trim() === "—",
      ),
    ).toBe(true);
  });

  // Component bug (see the e2e report): choosing an operator before typing a value stores
  // `{ op, value: "" }`, which the text filter's autoRemove drops, so the first keystroke rebuilds
  // the filter with the default "contains" and the chosen operator is lost.
  test("an operator chosen before the value is kept once the value is typed", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const popover = await openFilter(page, "notes");
    await popover.getByRole("combobox", { name: "Filter" }).click();
    await page.getByRole("option", { name: "Starts with" }).click();
    await expect(popover.getByRole("combobox", { name: "Filter" })).toContainText("Starts with");
    await popover.getByRole("textbox", { name: "Filter" }).fill("Wants");
    await expect(filterChips(page)).toContainText("starts with “Wants”");
  });

  test("a number range filter on MRR keeps only rows within the range", async ({ openDemo }) => {
    const page = await openDemo("grid");
    // Bounds taken from the first page so the range is guaranteed to keep some rows.
    const sample = (await cells(page, "mrr").allInnerTexts())
      .map(money)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const min = sample[0]!;
    const max = sample[sample.length - 1]!;

    const popover = await openFilter(page, "mrr");
    await popover.getByLabel("Min").fill(String(min));
    await expect(filterChips(page)).toContainText("MRR");
    await expect(filterChips(page)).toContainText("≥");
    await popover.getByLabel("Max").fill(String(max));
    await expect(filterChips(page)).toContainText("–");
    await page.keyboard.press("Escape");

    await expect(pager(page)).not.toContainText("of 500 row");
    const values = (await cells(page, "mrr").allInnerTexts()).map(money);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThanOrEqual(max);
    }

    // The popover's own clear button removes the filter.
    await openFilter(page, "mrr");
    await popover.getByRole("button", { name: "Clear" }).click();
    await expect(filterChips(page)).toHaveCount(0);
    await expect(pager(page)).toContainText("of 500 row");
  });

  test("two filters show a Clear button that removes both", async ({ openDemo }) => {
    const page = await openDemo("grid");
    let popover = await openFilter(page, "status");
    await popover
      .getByRole("option", { name: /Active/ })
      .getByRole("checkbox")
      .click();
    await page.keyboard.press("Escape");
    popover = await openFilter(page, "plan");
    await popover.getByRole("option", { name: /Pro/ }).getByRole("checkbox").click();
    await page.keyboard.press("Escape");

    const chips = filterChips(page);
    await expect(chips.getByRole("button", { name: /^Clear: / })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Filter/ }).first()).toBeVisible();
    await chips.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(chips).toHaveCount(0);
    await expect(pager(page)).toContainText("of 500 row");
  });
});
