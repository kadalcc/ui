import { cells, expect, header, openColumnMenu, sortButton, test } from "./fixtures";

const lower = (s: string) => s.trim().toLowerCase();

test.describe("sorting", () => {
  test("clicking a header sorts ascending, then descending", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const name = header(page, "name");
    await expect(name).toHaveAttribute("aria-sort", "none");

    await sortButton(page, "name").click();
    await expect(name).toHaveAttribute("aria-sort", "ascending");
    const asc = await cells(page, "name").allInnerTexts();
    expect(asc).toHaveLength(10);
    expect(lower(asc[0]!) <= lower(asc[asc.length - 1]!)).toBe(true);

    await sortButton(page, "name").click();
    await expect(name).toHaveAttribute("aria-sort", "descending");
    const desc = await cells(page, "name").allInnerTexts();
    expect(lower(desc[0]!) >= lower(desc[desc.length - 1]!)).toBe(true);
    expect(lower(desc[0]!) > lower(asc[0]!)).toBe(true);
  });

  test("shift-click adds a second key and numbers the sorted headers", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await sortButton(page, "team").click();
    await sortButton(page, "name").click({ modifiers: ["Shift"] });
    await expect(header(page, "team")).toHaveAttribute("aria-sort", "ascending");
    await expect(header(page, "name")).toHaveAttribute("aria-sort", "ascending");
    // The badge after the title is the key's position in the sort.
    await expect(sortButton(page, "team")).toHaveText(/^Team\s*1$/);
    await expect(sortButton(page, "name")).toHaveText(/^Name\s*2$/);
    const teams = await cells(page, "team").allInnerTexts();
    expect(teams).toEqual([...teams].sort((a, b) => lower(a).localeCompare(lower(b))));

    // Shift-clicking the first key flips it and keeps its place.
    await sortButton(page, "team").click({ modifiers: ["Shift"] });
    await expect(header(page, "team")).toHaveAttribute("aria-sort", "descending");
    await expect(sortButton(page, "team")).toHaveText(/^Team\s*1$/);
    await expect(header(page, "name")).toHaveAttribute("aria-sort", "ascending");

    // A plain click replaces the whole sort with one key: no badges left.
    await sortButton(page, "plan").click();
    await expect(header(page, "plan")).toHaveAttribute("aria-sort", "ascending");
    await expect(header(page, "team")).toHaveAttribute("aria-sort", "none");
    await expect(header(page, "name")).toHaveAttribute("aria-sort", "none");
    await expect(sortButton(page, "plan")).toHaveText(/^Plan$/);
  });

  test("the column menu sorts and clears the sort", async ({ openDemo }) => {
    const page = await openDemo("grid");
    let menu = await openColumnMenu(page, "plan");
    await menu.getByRole("menuitem", { name: "Sort descending" }).click();
    await expect(header(page, "plan")).toHaveAttribute("aria-sort", "descending");

    menu = await openColumnMenu(page, "plan");
    await expect(menu.getByRole("menuitem", { name: "Sort descending" })).toContainText("applied");
    await menu.getByRole("menuitem", { name: "Clear sort" }).click();
    await expect(header(page, "plan")).toHaveAttribute("aria-sort", "none");
  });
});
