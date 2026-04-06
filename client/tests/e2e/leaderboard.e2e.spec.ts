import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { logInUser } from "./testUtils";

const selectors = {
  leaderboardTable: "table.leaderboardTable",
  leaderboardRows: "table.leaderboardTable tbody tr",
  friendsOnlyCheckbox: 'input[type="checkbox"]',
  paginationPrev: 'button:has-text("Previous")',
  paginationNext: 'button:has-text("Next")',
  timeRangeSelect: "#timeRangeSelect",
  pointsToNext: 'div:has-text("You need")',
};

let userContext1: BrowserContext;
let page1: Page;

test.beforeEach(async ({ browser }) => {
  userContext1 = await browser.newContext();
  page1 = await userContext1.newPage();

  await logInUser(page1, "user1", "pwd1111");
  await page1.getByRole("link", { name: /leaderboard/i }).click();
  await page1.waitForURL("**/leaderboard");
  const loading = page1.getByText("Loading...");
  if (await loading.count()) {
    await expect(loading).toBeHidden();
  }
});

test.afterEach(async () => {
  await userContext1.close();
});

test.describe("Leaderboard Page", () => {
  test("shows leaderboard table and columns", async () => {
    await expect(page1.locator(selectors.leaderboardTable)).toBeVisible();

    await expect(page1.getByRole("columnheader", { name: "Rank" })).toBeVisible();
    await expect(page1.getByRole("columnheader", { name: "Player" })).toBeVisible();
    await expect(page1.getByRole("columnheader", { name: "Wins" })).toBeVisible();

    await expect(page1.locator(selectors.leaderboardRows).first()).toBeVisible();
  });

  test("shows friends-only checkbox and can toggle it", async () => {
    const checkbox = page1.locator(selectors.friendsOnlyCheckbox);

    await expect(checkbox).toBeVisible();

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("shows pagination buttons if multiple pages exist", async () => {
    const nextBtn = page1.locator(selectors.paginationNext);
    const prevBtn = page1.locator(selectors.paginationPrev);

    if (await nextBtn.count()) {
      await expect(nextBtn).toBeVisible();
      await expect(prevBtn).toBeVisible();

      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
      }
    }
  });

  test("shows time range select and allows changing it", async () => {
    const select = page1.locator(selectors.timeRangeSelect);

    await expect(select).toBeVisible();

    await select.selectOption("daily");
    await expect(select).toHaveValue("daily");

    const loading = page1.getByText("Loading...");
    if (await loading.count()) {
      await expect(loading).toBeHidden();
    }

    await expect(page1.locator(selectors.leaderboardTable)).toBeVisible();
  });

  test("shows points to next rank if applicable", async () => {
    const points = page1.locator(selectors.pointsToNext);

    if (await points.count()) {
      await expect(points).toBeVisible();
      await expect(points).toContainText("You need");
    }
  });
});
