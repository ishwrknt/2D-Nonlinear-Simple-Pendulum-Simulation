import { test, expect, type Page } from "@playwright/test";
async function value(page: Page, label: string) {
  return Number(
    await page
      .locator("#live-data tr")
      .filter({ hasText: label })
      .locator("td")
      .textContent(),
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Explore the pendulum" }),
  ).toBeVisible();
});
test("starts paused; exactly one step, reset and playback", async ({
  page,
}) => {
  expect(await value(page, "Time (s)")).toBe(0);
  await page.click("#step-button");
  expect(await value(page, "Time (s)")).toBeCloseTo(1 / 240, 5);
  await page.waitForTimeout(150);
  expect(await value(page, "Time (s)")).toBeCloseTo(1 / 240, 5);
  await page.click("#play-button");
  await expect.poll(() => value(page, "Time (s)")).toBeGreaterThan(0.1);
  await page.click("#play-button");
  await expect(page.locator("#run-chip")).toHaveText("Paused");
  await page.click("#reset-button");
  expect(await value(page, "Time (s)")).toBe(0);
});
test("presets, units, numerical settings and physical data views", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Losing energy", exact: true })
    .click();
  await page
    .getByText("Damping, driving & initial speed", { exact: true })
    .click();
  await expect(page.locator("#linearDamping-input")).toHaveValue("0.08");
  await page.locator("#mass-input").fill("2");
  await page.locator("#mass-input").press("Tab");
  expect(await value(page, "Time (s)")).toBe(0);
  await page.getByText("Numerical settings", { exact: true }).click();
  await page.selectOption("#mode-select", "cartesian");
  await page.selectOption("#dt-select", String(1 / 120));
  await page.click("#step-button");
  expect(await value(page, "Time (s)")).toBeCloseTo(1 / 120, 5);
  await page.selectOption("#data-select", "energy");
  await expect(page.locator("#live-data")).toContainText(
    "Energy dissipated (J)",
  );
  await page.selectOption("#data-select", "motion");
  await expect(page.locator("#live-data")).toContainText(
    "Angular acceleration (rad/s²)",
  );
  expect(await value(page, "Angular velocity (rad/s)")).toBeLessThan(0);
  for (const mode of [
    "theta",
    "omega",
    "energy",
    "balance",
    "phase",
    "x",
    "y",
  ]) {
    await page.selectOption("#graph-select", mode);
    await expect(page.locator("#graph-caption")).toContainText(
      "Axes scale automatically",
    );
  }
});
test("CSV preserves SI values, parameters and retained interval", async ({
  page,
}) => {
  await page.click("#step-button");
  const promise = page.waitForEvent("download");
  await page.click("#export-button");
  const download = await promise;
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  expect(text).toContain("0.3.0");
  expect(text).toContain("mode=angular");
  expect(text).toContain("retained=2; total=2");
  expect(text).toContain("theta rad");
  const rows = text.split("\n").filter((l) => !l.startsWith("#"));
  expect(rows.length).toBe(3);
  expect(Number(rows[2].split(",")[0])).toBeCloseTo(1 / 240, 12);
});
test("shared settings round-trip and invalid settings safely fall back", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Large oscillations", exact: true })
    .click();
  await page.getByText("Numerical settings", { exact: true }).click();
  await page.selectOption("#mode-select", "cartesian");
  const link = await page.locator("#share-link").inputValue();
  await page.goto(link);
  await expect(page.locator("#initialAngle-input")).toHaveValue("90");
  await expect(page.locator("#mode-select")).toHaveValue("cartesian");
  expect(await value(page, "Time (s)")).toBe(0);
  await page.goto("/?setup=%7B%22mass%22%3A0%7D");
  await expect(page.locator("#notice")).toContainText("invalid");
  await expect(page.locator("#mass-input")).toHaveValue("1");
});
test("invalid input blocks playback and preset restores validity", async ({
  page,
}) => {
  await page.locator("#length-input").fill("0");
  await page.locator("#length-input").press("Tab");
  await page.click("#play-button");
  await expect(page.locator("#run-chip")).toHaveText("Paused");
  await page
    .getByRole("button", { name: "Small oscillations", exact: true })
    .click();
  await page.click("#play-button");
  await expect.poll(() => value(page, "Time (s)")).toBeGreaterThan(0);
});
test("dragging bob releases from rest and resets experiment", async ({
  page,
}) => {
  const c = page.locator("#simulation-canvas");
  await c.scrollIntoViewIfNeeded();
  const box = (await c.boundingBox())!;
  const bx = Number(await c.getAttribute("data-bob-x")),
    by = Number(await c.getAttribute("data-bob-y"));
  await page.mouse.move(
    box.x + (bx / 800) * box.width,
    box.y + (by / 600) * box.height,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.7);
  await page.mouse.up();
  expect(await value(page, "Time (s)")).toBe(0);
  expect(await value(page, "Angular velocity (rad/s)")).toBe(0);
  expect(await value(page, "Angle (rad)")).toBeLessThan(0);
});
test("responsive layout and no browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#play-button")).toBeVisible();
  await page.click("#play-button");
  await page.waitForTimeout(150);
  await page.click("#play-button");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "validation/mobile-preview.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "validation/desktop-preview.png",
    fullPage: true,
  });
});

test("fit checkbox preserves a full run beyond the former 40-second limit", async ({
  page,
}) => {
  await page.clock.install();
  await page.reload();
  await expect(page.locator("#initialAngle-input")).toHaveValue("10");
  await expect(page.locator("#fit-all-data")).toBeChecked();
  await expect(page.locator("#window-select")).toBeDisabled();
  await page.selectOption("#speed-select", "2");
  await page.click("#play-button");
  await page.clock.runFor(30000);
  await page.click("#play-button");
  expect(await value(page, "Time (s)")).toBeGreaterThan(45);
  await expect(page.locator("#retention")).toContainText("0.000–");
  const downloadPromise = page.waitForEvent("download");
  await page.click("#export-button");
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  const rows = csv.split("\n").filter((l) => !l.startsWith("#"));
  expect(rows.length).toBeGreaterThan(10000);
  expect(Number(rows[1].split(",")[0])).toBe(0);
  await page.uncheck("#fit-all-data");
  await expect(page.locator("#window-select")).toBeEnabled();
  await expect(page.locator("#graph-caption")).toContainText("last 10 seconds");
  await page.check("#fit-all-data");
  await expect(page.locator("#graph-caption")).toContainText("full run");
});

test("fluid investigations change density and viscosity independently and share correctly", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Under water", exact: true }).click();
  await expect(page.locator("#fluid-controls")).toHaveAttribute("open", "");
  await expect(page.locator("#fluidDensity-input")).toHaveValue("1000");
  await expect(page.locator("#fluidViscosity-input")).toHaveValue("0.001");
  await expect(page.locator("#live-data")).toContainText("Effective gravity");
  await expect(page.locator("#data-select")).toHaveValue("fluid");
  await page.getByRole("button", { name: "Oil", exact: true }).click();
  await expect(page.locator("#fluidDensity-input")).toHaveValue("900");
  await expect(page.locator("#fluidViscosity-input")).toHaveValue("0.1");
  await expect(page.locator("#mass-input")).toHaveValue("0.1");
  await page.locator("#fluidDensity-input").fill("1100");
  await page.locator("#fluidDensity-input").press("Tab");
  await expect(page.locator("#fluidViscosity-input")).toHaveValue("0.1");
  const link = await page.locator("#share-link").inputValue();
  await page.goto(link);
  await expect(page.locator("#fluidDensity-input")).toHaveValue("1100");
  await expect(page.locator("#fluidViscosity-input")).toHaveValue("0.1");
  await page
    .getByRole("button", { name: "A buoyant bob", exact: true })
    .click();
  expect(await value(page, "Effective gravity (m/s²)")).toBeLessThan(0);
  await expect(page.locator("#live-data")).toContainText(
    "reverses the restoring torque",
  );
  await expect(
    page.getByRole("heading", {
      name: "What changes when water is replaced by oil?",
    }),
  ).toBeVisible();
});

test("wide physical inputs and new investigations work", async ({ page }) => {
  await page.locator("#length-input").fill("12");
  await page.locator("#length-input").press("Tab");
  await page.locator("#mass-input").fill("0.02");
  await page.locator("#mass-input").press("Tab");
  await page
    .getByText("Damping, driving & initial speed", { exact: true })
    .click();
  await page.locator("#linearDamping-input").fill("3");
  await page.locator("#linearDamping-input").press("Tab");
  await page.click("#step-button");
  expect(await value(page, "Time (s)")).toBeGreaterThan(0);
  const link = await page.locator("#share-link").inputValue();
  await page.goto(link);
  await expect(page.locator("#length-input")).toHaveValue("12");
  await expect(page.locator("#mass-input")).toHaveValue("0.02");
  for (const name of [
    "On the Moon",
    "Long pendulum",
    "Strong damping",
    "Near-neutral buoyancy",
    "Oil",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.click("#step-button");
    await expect(page.locator("#notice")).not.toContainText("Error");
  }
});
