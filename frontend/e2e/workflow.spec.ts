import { test, expect } from "@playwright/test";

test("complaint intake, correction, ledger persistence and PDF triage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5173");
  await expect(page.getByText("Demo mode · no LLM")).toBeVisible();
  await page.getByRole("button", { name: "Discolored capsules" }).click();
  await expect(
    page.getByLabel("Batch / lot number *", { exact: true }),
  ).toHaveValue("AMX240602");
  await page
    .getByLabel("Message to copilot")
    .fill(
      "Sorry the batch number is BMX240602 and affected quantity is 48 capsules",
    );
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByLabel("Batch / lot number *", { exact: true }),
  ).toHaveValue("BMX240602");
  await expect(
    page.getByLabel("Affected quantity *", { exact: true }),
  ).toHaveValue("48 capsules");
  await page
    .getByLabel("Reviewer name", { exact: true })
    .fill("Demo QA Reviewer");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Commit to QMS ledger" }).click();
  await expect(page.getByText("Complaint register")).toBeVisible();
  const recordId = (await page.getByRole("status").innerText()).match(
    /CC-[A-F0-9]+/,
  )![0];
  await page.reload();
  await page.getByRole("button", { name: "QMS ledger", exact: true }).click();
  await page.getByLabel("Search ledger").fill(recordId);
  await expect(page.getByText("BMX240602", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByLabel("Reviewer", { exact: true }).fill("Demo QA Reviewer");
  await page
    .getByLabel("Investigation / closure note")
    .fill("Retain samples requested; packaging records under QA review.");
  await page.getByRole("button", { name: "Start investigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close complaint", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close record" }).click();
  await page
    .getByRole("button", { name: "New complaint", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles("../samples/api-complaint.pdf");
  await expect(
    page.getByLabel("Product name (API / FDF) *", { exact: true }),
  ).toHaveValue("Metformin Hydrochloride API");
  await expect(page.locator("strong.critical")).toContainText("Critical");
  await expect(page.getByLabel("Expiry date", { exact: true })).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
