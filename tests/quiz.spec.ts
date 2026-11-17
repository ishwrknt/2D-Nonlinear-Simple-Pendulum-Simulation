import { test, expect, type Page } from "@playwright/test";
import { questionBank, levels, type Level } from "../src/quiz-bank";
const byPrompt = new Map(questionBank.map((q) => [q.prompt, q]));
async function register(page: Page, level: Level, name = "Asha <Student>") {
  await page.locator("#student-name").fill(name);
  await page.locator("#student-roll").fill("R&17");
  await page
    .locator("#student-class")
    .fill(level.startsWith("school") ? "School class" : "Physics programme");
  await page.locator("#student-level").selectOption(level);
  await page
    .getByRole("button", { name: "Start Part One", exact: true })
    .click();
}
async function answer(page: Page, right = true) {
  const prompt = await page.locator("legend").innerText(),
    q = byPrompt.get(prompt)!;
  expect(q).toBeTruthy();
  const text =
    q.options[right ? q.correct : (q.correct + 1) % q.options.length];
  await page.getByLabel(text, { exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator("#feedback-title")).toContainText(
    right ? "Correct" : "Not quite",
  );
  await expect(page.locator("#answer-feedback")).toContainText(q.explanation);
  await expect(page.locator("input[type=radio]").first()).toBeDisabled();
  return q;
}
for (const level of Object.keys(levels) as Level[])
  test(`${level}: identity, sequential randomized parts, certificate and optional challenge`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/quiz.html");
    await register(page, level);
    const ids: string[] = [];
    for (let i = 0; i < 16; i++) {
      await expect(page.locator("h1")).toContainText(
        i < 8 ? "Part One" : "Part Two",
      );
      await expect(page.locator("#student-certificate")).toHaveCount(0);
      await expect(page.locator("#next-question")).toHaveCount(0);
      const q = await answer(page, i < 10);
      ids.push(q.id);
      if (i === 0) {
        await page.reload();
        await expect(page.locator("legend")).toHaveText(q.prompt);
        await expect(page.locator("#feedback-title")).toHaveText("Correct");
      }
      if (i === 7)
        await expect(page.locator("#next-question")).toHaveText(
          "Complete Part One · continue to Part Two",
        );
      await page.locator("#next-question").click();
    }
    expect(new Set(ids).size).toBe(16);
    await expect(
      page.getByRole("heading", {
        name: "Your result: 10 / 16 (62.5%)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".certificate-name")).toHaveText(
      "Asha <Student>",
    );
    await expect(page.locator("#student-certificate")).toContainText(
      levels[level].label,
    );
    await expect(page.locator("#student-certificate")).toContainText("R&17");
    const cert = (await page.locator("#student-certificate").textContent())!;
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#download-certificate").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    let html = "";
    for await (const chunk of stream!) html += chunk;
    expect(html).toContain("Asha &lt;Student&gt;");
    expect(html).not.toContain("<Student>");
    expect(html).toContain("62.5%");
    if (level === "msc") {
      await page
        .locator("#student-certificate")
        .screenshot({ path: "validation/learning-certificate.png" });
      await page.pdf({
        path: "validation/learning-certificate.pdf",
        preferCSSPageSize: true,
        printBackground: true,
      });
    }
    await page.locator("#optional-start").click();
    for (let i = 0; i < 6; i++) {
      await expect(page.locator("h1")).toContainText("Part Three");
      await answer(page, false);
      if (i === 0) {
        await page.locator("#required-result").click();
        await expect(page.locator("#student-certificate")).toHaveText(cert);
        await page.locator("#optional-start").click();
        await expect(page.locator("#feedback-title")).toContainText(
          "Not quite",
        );
      }
      await page.locator("#next-question").click();
    }
    await expect(page.locator("main")).toContainText(
      "Optional Part Three: 0 / 6",
    );
    await expect(page.locator("#student-certificate")).toHaveText(cert);
    await page.reload();
    await expect(page.locator("#student-certificate")).toHaveText(cert);
    await page.locator("#clear-student").click();
    await expect(page.locator("#student-name")).toHaveValue("");
    await expect(page.locator("#student-certificate")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("pendulum-learning-attempt-v1"),
      ),
    ).toBeNull();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pendulum-learning-recent-v1"),
      ),
    ).not.toContain("Asha");
    expect(errors).toEqual([]);
  });
test("below-threshold completion cannot earn a certificate from optional marks; new attempt changes questions", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/quiz.html?part=2");
  await expect(page.locator("#student-form")).toBeVisible();
  await register(page, "bsc", "Ravi");
  const previous: string[] = [];
  for (let i = 0; i < 16; i++) {
    previous.push((await answer(page, i < 9)).id);
    await page.locator("#next-question").click();
  }
  await expect(page.locator("#student-certificate")).toHaveCount(0);
  await expect(page.locator("#download-certificate")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("56.3%");
  await page.locator("#optional-start").click();
  for (let i = 0; i < 6; i++) {
    await answer(page, true);
    await page.locator("#next-question").click();
  }
  await expect(page.locator("#student-certificate")).toHaveCount(0);
  await expect(page.locator("main")).toContainText(
    "Optional Part Three: 6 / 6",
  );
  await page.locator("#retry-quiz").click();
  await expect(page.locator("#student-name")).toHaveValue("Ravi");
  await page
    .getByRole("button", { name: "Start Part One", exact: true })
    .click();
  const next = byPrompt.get(await page.locator("legend").innerText())!;
  expect(previous).not.toContain(next.id);
  await expect(page.locator("#answer-feedback")).toBeEmpty();
});
test("mobile registration validation, one-answer flow, simulation replay and incomplete certificate gate", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Start the learning check →" }).click();
  await page
    .getByRole("button", { name: "Start Part One", exact: true })
    .click();
  await expect(page.locator("legend")).toHaveCount(0);
  await register(page, "school9", "School Student");
  await page.clock.install();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator("#feedback-title")).toHaveCount(0);
  await answer(page);
  await page.locator("#demo-play").click();
  await page.clock.runFor(12500);
  await expect(page.locator("#demo-play")).toBeDisabled();
  await page.locator("#demo-reset").click();
  await expect(page.locator("#demo-values")).toContainText(
    "Simulated time: 0.00 s",
  );
  await page.locator("#demo-play").click();
  await page.clock.runFor(500);
  await expect(page.locator("#demo-values")).not.toContainText(
    "Simulated time: 0.00 s",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#student-certificate")).toHaveCount(0);
  await page.screenshot({
    path: "validation/learning-mobile.png",
    fullPage: true,
  });
});
