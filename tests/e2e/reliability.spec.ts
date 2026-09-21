import { expect, test } from "@playwright/test";

for (const locale of ["tr", "en"] as const) {
  const route = locale === "tr" ? "/?lang=tr" : "/en/?lang=en";

  test(`${locale} CUTLASS quiz restarts with a fresh bounded score`, async ({ page }) => {
    await page.goto(`${route}&module=cutlass`);
    const quiz = page.locator(".cutlass-cute-surface .quiz");
    for (let round = 0; round < 2; round++) {
      for (const [question, answer] of [3, 1, 2, 1].entries()) {
        await quiz.locator(".answers button").nth(answer).click();
        await expect(quiz.locator(".score")).toContainText(`${question + 1}/4`);
        if (question === 3) {
          await expect(quiz.locator(".quiz-feedback button")).toHaveText(locale === "tr" ? "Testi yeniden başlat ↻" : "Restart quiz ↻");
        }
        await quiz.locator(".quiz-feedback button").click();
      }
      await expect(quiz.locator(".score")).toContainText("0/4");
    }
  });

  test(`${locale} every module exposes source dates and relevant portfolio paths`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
    await expect(page.locator(".atlas-portfolio-footer a")).toHaveAttribute("href", `https://aserdargun.com/${locale === "tr" ? "tr/" : ""}`);
    await expect(page.locator(".learning-connections")).toContainText(locale === "tr" ? "POL yalnızca İngilizcedir" : "POL is English only");
    for (const id of ["visual", "toolchain", "architecture", "memory", "triton", "operators", "correctness", "profiling", "cutlass", "inference", "multigpu", "systems"]) {
      await page.getByTestId(`atlas-module-${id}`).click();
      await expect(page.getByTestId("atlas-module-title")).toBeVisible();
      const sources = page.locator(".module-sources");
      await expect(sources.locator("time").first()).toHaveAttribute("datetime", /^2026-09-(04|21)$/);
      const urls = await sources.locator("a").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
      expect(urls.length).toBeGreaterThan(0);
      expect(new Set(urls).size).toBe(urls.length);
      await expect(page.locator(".module-finish")).toContainText(locale === "tr" ? "kişisel ilerleme" : "personal progress");
      if (id === "toolchain") await expect(page.locator(".learning-connections a")).toHaveAttribute("href", "https://pol.aserdargun.com/");
      if (id === "inference") {
        await expect(page.locator('.learning-connections a[href*="llm.aserdargun.com"]')).toHaveAttribute("href", `https://llm.aserdargun.com/${locale}`);
        await expect(page.locator('.learning-connections a[href*="tfl.aserdargun.com"]')).toHaveAttribute("href", `https://tfl.aserdargun.com/?lang=${locale}`);
      }
    }
  });

  test(`${locale} long-to-short studio transitions never reuse an invalid step`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
    for (const id of ["inference", "systems", "multigpu", "toolchain", "visual", "memory", "triton", "correctness", "cutlass", "operators", "architecture", "profiling"]) {
      await page.getByTestId(`atlas-module-${id}`).click();
      await expect(page.getByTestId("atlas-module-title")).toBeVisible();
      await expect(page.locator(".cs-steps button").first()).toHaveAttribute("aria-current", "step");
      await page.locator(".cs-steps button").last().click();
    }
  });

  test(`${locale} lesson survives refresh, locale changes, and browser history`, async ({ page }) => {
    await page.goto(`${route}&module=memory`);
    await expect(page.locator(".gpu-memory-surface")).toBeVisible();
    await page.reload();
    await expect(page.locator(".gpu-memory-surface")).toBeVisible();
    await page.getByRole("button", { name: locale === "tr" ? "EN" : "TR", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "tr" ? "en" : "tr");
    await expect(page.locator(".gpu-memory-surface")).toBeVisible();
    await page.getByTestId("atlas-module-inference").click();
    await expect(page.locator(".inference-systems-surface")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".gpu-memory-surface")).toBeVisible();
    await page.goForward();
    await expect(page.locator(".inference-systems-surface")).toBeVisible();
  });

  test(`${locale} reduced motion freezes playback and still supports manual steps`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${route}&module=visual`);
    await expect(page.locator(".cs-play")).toBeDisabled();
    const caption = page.locator(".cs-captionbar");
    const initial = await caption.textContent() ?? "";
    await page.waitForTimeout(3700);
    await expect(caption).toHaveText(initial);
    await page.locator(".cs-steps button").nth(1).click();
    await expect(caption).not.toHaveText(initial);
  });

  test(`${locale} mask model reports unsafe lanes without granting GPU success or progress`, async ({ page }) => {
    await page.goto(`${route}&module=triton`);
    const root = page.locator(".pytorch-triton-surface");
    await expect(root.locator(".progress-label strong")).toContainText("0");
    await root.locator(".run-button").click();
    await expect(root.locator('.test-results p[data-out-of-bounds="255"]')).toHaveCount(3);
    await root.locator('.checks input[type="checkbox"]').last().check();
    await root.locator(".run-button").click();
    await expect(root.locator('.test-results p[data-out-of-bounds="0"]')).toHaveCount(3);
    await expect(root.locator(".evidence-strip")).not.toContainText(/18\.7|612|4\s*\/\s*4/);
    await expect(root.locator(".progress-label strong")).toContainText("0");
    await root.locator(".review-example").click();
    await expect(root.locator(".progress-label strong")).toContainText("100");
    await page.reload();
    await expect(root.locator(".review-example")).toHaveAttribute("aria-pressed", "true");
    await root.locator(".review-example").click();
    await expect(root.locator(".progress-label strong")).toContainText("0");
  });

  test(`${locale} clipboard denial gives an honest recoverable status`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
    });
    await page.goto(`${route}&module=correctness`);
    const root = page.locator(".kernel-safety-surface");
    await root.locator(".generated-command button").click();
    await expect(root.locator('p[role="status"]')).toContainText(locale === "tr" ? "Panoya erişilemedi" : "Clipboard unavailable");
    await expect(root.locator(".generated-command button")).not.toContainText(/Copied|Kopyalandı/);
  });
}

test("unknown lesson safely opens the overview", async ({ page }) => {
  await page.goto("/en/?module=obsolete");
  await expect(page.getByTestId("atlas-start")).toBeVisible();
});

test("a failed lazy laboratory preserves navigation and hides completion", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_STATIC_ARTIFACT !== "1", "Network-failure recovery runs against the static artifact; the dev overlay intercepts errors.");
  await page.route("**/*GpuMemoryEmbedded*", (route) => route.abort());
  await page.goto("/en/?module=memory");
  await expect(page.getByRole("heading", { name: "Laboratory unavailable" })).toBeVisible();
  await expect(page.getByTestId("atlas-complete")).toHaveCount(0);
  await page.getByRole("button", { name: "Return to atlas map", exact: true }).click();
  await expect(page.getByTestId("atlas-continue")).toBeVisible();
  await page.getByTestId("atlas-module-correctness").click();
  await expect(page.locator(".kernel-safety-surface")).toBeVisible();
});

test("mobile drawer isolates background interaction and restores the selected lesson", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
  await page.getByTestId("atlas-menu-button").click();
  await expect(page.locator("#atlas-content")).toHaveJSProperty("inert", true);
  await page.getByTestId("atlas-drawer").locator(".atlas-module-nav button").nth(3).click();
  await expect(page.locator(".gpu-memory-surface")).toBeVisible();
  await expect(page.locator("#atlas-content")).toHaveJSProperty("inert", false);
  await expect(page.getByTestId("atlas-module-title")).toBeFocused();
});

test("saved review questions do not inflate completed lesson progress", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kernel-forge-progress", JSON.stringify(["cpp-0", "q-0", "q-1", "q-2"]));
  });
  await page.goto("/en/?module=toolchain");
  await expect(page.locator(".kernel-forge-surface .progress-head strong")).toHaveText("7%");
});

test("English question search uses English casing for capital I", async ({ page }) => {
  await page.goto("/en/?module=toolchain");
  const root = page.locator(".kernel-forge-surface");
  await root.locator(":scope > .topbar [role=group] > button").nth(2).click();
  await root.locator(".question-tools input").fill("IS");
  await expect(root.locator(".question-list article").first()).toBeVisible();
});
