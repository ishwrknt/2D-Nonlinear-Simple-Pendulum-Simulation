import { expect, test } from "@playwright/test";

async function numberFromRow(page: import("@playwright/test").Page, tableLocator: string, label: string): Promise<number> {
  const row = page.locator(`${tableLocator} tr`).filter({ hasText: label }).first();
  const valueColumnIndex = tableLocator.includes("instant-table") ? 2 : 1;
  const valueText = (await row.locator("td").nth(valueColumnIndex).textContent()) ?? "";
  const numeric = Number.parseFloat(valueText);
  if (Number.isNaN(numeric)) {
    throw new Error(`Could not parse numeric value for ${label}: ${valueText}`);
  }
  return numeric;
}

async function setRangeValue(page: import("@playwright/test").Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function dragBob(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.locator("#simulation-canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Simulation canvas box unavailable.");
  }
  const [bobXAttr, bobYAttr] = await Promise.all([
    canvas.getAttribute("data-bob-x"),
    canvas.getAttribute("data-bob-y"),
  ]);
  if (!bobXAttr || !bobYAttr) {
    throw new Error("Current bob coordinates are unavailable.");
  }
  const pivotX = box.x + box.width * 0.5;
  const pivotY = box.y + (84 / 640) * box.height;
  const startX = box.x + (Number.parseFloat(bobXAttr) / 960) * box.width;
  const startY = box.y + (Number.parseFloat(bobYAttr) / 640) * box.height;
  const targetX = pivotX - 240 * (box.width / 960);
  const targetY = pivotY + 150 * (box.height / 640);

  await canvas.dispatchEvent("pointerdown", {
    clientX: startX,
    clientY: startY,
    pointerId: 1,
    bubbles: true,
  });
  await canvas.dispatchEvent("pointermove", {
    clientX: targetX,
    clientY: targetY,
    pointerId: 1,
    bubbles: true,
  });
  await canvas.dispatchEvent("pointerup", {
    clientX: targetX,
    clientY: targetY,
    pointerId: 1,
    bubbles: true,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "2D Nonlinear Simple Pendulum Simulation" })).toBeVisible();
});

test("renders baseline educational panels", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Simulation Canvas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Controls" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live Data" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Graph Panel" })).toBeVisible();
  await expect(page.locator("#graph-caption")).toContainText("Angular position vs time");
  await expect(page.locator("#mode-chip")).toContainText("Angular");
  await expect(page.locator("#run-chip")).toContainText("Running");
  await expect(page.locator("#instant-table table")).toBeVisible();
  await expect(page.locator("#derived-table table")).toBeVisible();
  await expect(page.locator(".canvas-toggles")).toContainText("Forces");
  await expect(page.locator(".canvas-toggles")).toContainText("Energy");
  await expect(page.locator("#equation-panel")).toHaveCount(0);
  await expect(page.locator("#toggle-equations")).toHaveCount(0);
  await expect(page.locator("#mass-input")).toHaveCount(0);
  await expect(page.locator("#quadratic-input")).toHaveCount(0);
  await expect(page.locator("#toggle-motion")).toHaveCount(0);
  await expect(page.locator("#toggle-phase")).toHaveCount(0);
  await expect(page.locator("#toggle-values")).toHaveCount(0);
  await expect(page.locator("#toggle-derived")).toHaveCount(0);
  await expect(page.locator("#toggle-gravity-vector")).toHaveCount(0);
  await expect(page.locator("#toggle-velocity-vector")).toHaveCount(0);
  await expect(page.locator("#toggle-tension-vector")).toHaveCount(0);
  await expect(page.locator("#toggle-acceleration-vector")).toHaveCount(0);
  await expect(page.locator("#instant-table")).not.toContainText("Angular acceleration");
  await expect(page.locator("#instant-table")).not.toContainText("Total energy");
  await expect(page.locator("#instant-table")).not.toContainText("Kinetic energy");
  await expect(page.locator("#instant-table")).not.toContainText("Potential energy");
  await expect(page.locator("#derived-table")).not.toContainText("Maximum angle reached");
  await expect(page.locator("#derived-table")).not.toContainText("Energy drift");
});

test("play, pause, step, and reset update simulation state", async ({ page }) => {
  await expect(page.locator("#run-chip")).toContainText("Running");
  await page.waitForTimeout(250);
  const runningTime = await numberFromRow(page, "#instant-table table", "Time");
  expect(runningTime).toBeGreaterThan(0);

  await page.click("#pause-button");
  await expect(page.locator("#run-chip")).toContainText("Paused");
  const pausedBeforeStep = await numberFromRow(page, "#instant-table table", "Time");

  await page.click("#step-button");
  const steppedFromPausedTime = await numberFromRow(page, "#instant-table table", "Time");
  expect(steppedFromPausedTime - pausedBeforeStep).toBeGreaterThan(0.09);
  expect(steppedFromPausedTime - pausedBeforeStep).toBeLessThan(0.11);

  const pausedTime = steppedFromPausedTime;
  await page.waitForTimeout(150);
  const pausedTimeAfterWait = await numberFromRow(page, "#instant-table table", "Time");
  expect(pausedTimeAfterWait).toBeCloseTo(pausedTime, 4);

  await page.click("#step-button");
  const steppedTime = await numberFromRow(page, "#instant-table table", "Time");
  expect(steppedTime - pausedTime).toBeGreaterThan(0.09);
  expect(steppedTime - pausedTime).toBeLessThan(0.11);

  await page.click("#reset-button");
  const resetTime = await numberFromRow(page, "#instant-table table", "Time");
  expect(resetTime).toBe(0);
});

test("parameter changes force reset and preserve paused state", async ({ page }) => {
  await page.click("#play-button");
  await page.waitForTimeout(180);
  await setRangeValue(page, "#gravity-input", "12.5");
  await expect(page.locator("#run-chip")).toContainText("Paused");
  await expect(page.locator("#gravity-output")).toContainText("12.50 m/s²");
  const time = await numberFromRow(page, "#instant-table table", "Time");
  expect(time).toBe(0);
});

test("graph mode selection updates captions and cartesian restrictions", async ({ page }) => {
  await page.selectOption("#graph-select", "omega");
  await expect(page.locator("#graph-caption")).toContainText("Angular velocity vs time");

  await page.selectOption("#graph-select", "energy");
  await expect(page.locator("#graph-caption")).toContainText("Total energy vs time");

  await page.selectOption("#graph-time-scale-select", "compress");
  await expect(page.locator("#graph-caption")).toContainText("compressed time axis");
  await page.selectOption("#graph-time-scale-select", "scroll");

  await page.selectOption("#graph-select", "phase");
  await expect(page.locator("#graph-caption")).toContainText("θ vs ω with fixed reset-time scaling.");

  await page.selectOption("#graph-select", "x");
  await expect(page.locator("#graph-select")).toHaveValue("phase");

  await page.selectOption("#mode-select", "cartesian");
  await expect(page.locator("#mode-chip")).toContainText("Cartesian");
  await expect(page.locator("#instant-table")).toContainText("Time");

  await page.selectOption("#graph-select", "x");
  await expect(page.locator("#graph-select")).toHaveValue("x");
  await expect(page.locator("#graph-caption")).toContainText("Cartesian x vs time");

  await page.selectOption("#graph-select", "y");
  await expect(page.locator("#graph-caption")).toContainText("Cartesian y vs time");

  await page.selectOption("#mode-select", "angular");
  await expect(page.locator("#graph-select")).toHaveValue("theta");
  await expect(page.locator("#mode-chip")).toContainText("Angular");
});

test("in-canvas toggles control forces and energy overlays", async ({ page }) => {
  await page.selectOption("#graph-select", "energy");
  await page.uncheck("#toggle-energy");
  await expect(page.locator("#graph-canvas")).toBeVisible();
  await page.waitForTimeout(100);
  await expect(page.locator("#graph-caption")).toContainText("Total energy vs time");
  await page.check("#toggle-energy");
  await page.uncheck("#toggle-forces");
  await page.check("#toggle-forces");
  await expect(page.locator("#data-panel")).toBeVisible();
});

test("dragging the bob pauses, resets time, and changes the angle", async ({ page }) => {
  await page.click("#play-button");
  await page.waitForTimeout(180);
  const liveAngle = await numberFromRow(page, "#instant-table table", "Angle");
  await dragBob(page);
  await expect(page.locator("#run-chip")).toContainText("Paused");

  const time = await numberFromRow(page, "#instant-table table", "Time");
  const omega = await numberFromRow(page, "#instant-table table", "Angular velocity");
  const angle = await numberFromRow(page, "#instant-table table", "Angle");
  expect(time).toBe(0);
  expect(Math.abs(omega)).toBeLessThan(0.0001);
  expect(Math.abs(angle - liveAngle)).toBeGreaterThan(0.1);
});
