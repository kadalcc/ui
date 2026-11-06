import { cells, expect, pager, rows, test } from "./fixtures";

test.describe("pagination", () => {
  test("the page size select changes how many rows show", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await expect(rows(page)).toHaveCount(10);
    await page.getByRole("combobox", { name: "Rows per page" }).click();
    await page.getByRole("option", { name: "50", exact: true }).click();
    await expect(rows(page)).toHaveCount(50);
    await expect(pager(page)).toContainText("Page 1 of 10");
    await expect(page.getByRole("combobox", { name: "Rows per page" })).toContainText("50");
  });

  test("next and previous move a page at a time", { tag: "@mobile" }, async ({ openDemo }) => {
    const page = await openDemo("grid");
    const firstName = (await cells(page, "name").first().innerText()).trim();
    await expect(page.getByRole("button", { name: "Go to previous page" })).toBeDisabled();

    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(pager(page)).toContainText("Page 2 of 50");
    await expect(page.getByRole("button", { name: "Go to previous page" })).toBeEnabled();
    expect((await cells(page, "name").first().innerText()).trim()).not.toBe(firstName);

    await page.getByRole("button", { name: "Go to previous page" }).click();
    await expect(pager(page)).toContainText("Page 1 of 50");
    await expect(cells(page, "name").first()).toHaveText(firstName);
  });

  test("first and last jump to the ends", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await page.getByRole("button", { name: "Go to last page" }).click();
    await expect(pager(page)).toContainText("Page 50 of 50");
    await expect(page.getByRole("button", { name: "Go to next page" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Go to last page" })).toBeDisabled();
    await expect(rows(page)).toHaveCount(10);

    await page.getByRole("button", { name: "Go to first page" }).click();
    await expect(pager(page)).toContainText("Page 1 of 50");
    await expect(page.getByRole("button", { name: "Go to first page" })).toBeDisabled();
  });

  test("the go-to-page input jumps on Enter and ignores out-of-range pages", async ({
    openDemo,
  }) => {
    const page = await openDemo("grid");
    const goTo = page.getByRole("spinbutton", { name: "Go to page" });
    await goTo.fill("7");
    await goTo.press("Enter");
    await expect(pager(page)).toContainText("Page 7 of 50");
    await expect(goTo).toHaveValue("");
    await expect(goTo).toHaveAttribute("placeholder", "7");

    await goTo.fill("99");
    await goTo.press("Enter");
    await expect(pager(page)).toContainText("Page 7 of 50");
  });
});
