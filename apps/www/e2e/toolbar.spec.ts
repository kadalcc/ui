import { announcer, expect, header, rows, test, viewButton } from "./fixtures";

test.describe("toolbar", () => {
  test("the density menu changes the grid's density and the row height", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const root = page.locator("[data-slot=data-grid]");
    await expect(root).toHaveAttribute("data-density", "comfortable");
    const before = (await rows(page).first().boundingBox())!.height;

    await page.getByRole("button", { name: "Density" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Comfortable" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("menuitemradio", { name: "Compact" }).click();
    await expect(root).toHaveAttribute("data-density", "compact");
    await expect
      .poll(async () => (await rows(page).first().boundingBox())!.height)
      .toBeLessThan(before);

    // A radio menu stays open after a choice, so the next one is a direct click.
    await expect(page.getByRole("menuitemradio", { name: "Compact" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("menuitemradio", { name: "Spacious" }).click();
    await expect(root).toHaveAttribute("data-density", "spacious");
    await expect
      .poll(async () => (await rows(page).first().boundingBox())!.height)
      .toBeGreaterThan(before);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitemradio", { name: "Spacious" })).toBeHidden();
  });

  test("the View popover hides and shows a column", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const view = viewButton(page);
    await view.click();
    const notes = page.getByRole("checkbox", { name: "Notes" });
    await expect(notes).toBeChecked();
    await notes.click();
    await expect(header(page, "notes")).toHaveCount(0);
    await expect(view).toContainText("1 hidden");

    await notes.click();
    await expect(header(page, "notes")).toHaveCount(1);
    await expect(view).not.toContainText("hidden");
    await page.keyboard.press("Escape");
    await expect(notes).toBeHidden();
  });

  test("the View popover's column search and Show all", async ({ openDemo }) => {
    const page = await openDemo("grid");
    await viewButton(page).click();
    await page.getByRole("checkbox", { name: "Notes" }).click();
    await page.getByRole("checkbox", { name: "Country" }).click();
    await expect(viewButton(page)).toContainText("2 hidden");
    await page.getByRole("textbox", { name: "Search columns…" }).fill("cou");
    await expect(page.getByRole("checkbox", { name: "Country" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Notes" })).toHaveCount(0);
    await page.getByRole("button", { name: "Show all" }).click();
    await expect(header(page, "notes")).toHaveCount(1);
    await expect(header(page, "country")).toHaveCount(1);
  });

  test("Export → Copy to clipboard puts a tab-separated table on the clipboard", async ({
    openDemo,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "only Chromium grants clipboard-read to the test");
    const page = await openDemo("grid");
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByRole("menuitem", { name: "Download CSV" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Copy to clipboard" }).click();
    await expect(announcer(page)).toContainText(/^Copied/);
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
    expect(lines.length).toBeGreaterThan(10);
    expect(lines[0]).toContain("Name\tEmail");
    expect(lines[1]!.split("\t").length).toBe(lines[0]!.split("\t").length);
  });

  test("fullscreen toggles on and Escape turns it off", async ({ openDemo }) => {
    const page = await openDemo("grid");
    const root = page.locator("[data-slot=data-grid]");
    await page.getByRole("button", { name: "Fullscreen" }).click();
    await expect(root).toHaveAttribute("data-fullscreen", "true");
    await expect(page.getByRole("button", { name: "Exit fullscreen" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const box = (await root.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);

    await page.keyboard.press("Escape");
    await expect(root).not.toHaveAttribute("data-fullscreen", /.+/);
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });
});
