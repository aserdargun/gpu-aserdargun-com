import { chromium, expect, test, type Page } from "@playwright/test";

const locales = ["tr", "en"] as const;
const moduleIds = [
  "visual", "toolchain", "architecture", "memory", "triton", "operators", "correctness",
  "profiling", "cutlass", "inference", "multigpu", "systems",
] as const;
const moduleRoots = {
  visual: ".visual-foundations-embed",
  toolchain: ".kernel-forge-surface",
  architecture: ".cuda-simt-surface",
  memory: ".gpu-memory-surface",
  triton: ".pytorch-triton-surface",
  operators: ".llm-kernel-patterns-surface",
  correctness: ".kernel-safety-surface",
  profiling: ".nsight-benchmark-surface",
  cutlass: ".cutlass-cute-surface",
  inference: ".inference-systems-surface",
  multigpu: ".nccl-multigpu-surface",
  systems: ".gpu-software-stack-surface",
} satisfies Record<(typeof moduleIds)[number], string>;
const geometryViewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "compact-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "narrow-320", width: 320, height: 800 },
] as const;
type StateLocator = ReturnType<Page["locator"]>;
type StateSignatureTarget = StateLocator | { locator: StateLocator; read: () => Promise<string> };

function signatureLocator(target: StateSignatureTarget) {
  return "read" in target ? target.locator : target;
}

function customStateSignature(locator: StateLocator, read: () => Promise<string>): StateSignatureTarget {
  return { locator, read };
}

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function gotoAtlas(page: Page, locale: "tr" | "en") {
  await page.goto(locale === "en" ? "/en/" : "/?lang=tr", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
}

async function expectLocalizedDocumentHead(page: Page, locale: "tr" | "en") {
  const english = locale === "en";
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page).toHaveTitle(english
    ? "GPU Kernel Atlas — GPU Kernel Engineering"
    : "GPU Kernel Atlas — GPU Kernel Mühendisliği");
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute(
    "content",
    english ? /A unified 12-week interactive learning atlas/ : /birleşik 12 haftalık etkileşimli öğrenme atlası/,
  );
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
    "href",
    english ? "https://gpu.aserdargun.com/en/" : "https://gpu.aserdargun.com/",
  );
  await expect(page.locator('head link[rel="alternate"][hreflang="tr-TR"]')).toHaveAttribute("href", "https://gpu.aserdargun.com/");
  await expect(page.locator('head link[rel="alternate"][hreflang="en-US"]')).toHaveAttribute("href", "https://gpu.aserdargun.com/en/");
  await expect(page.locator('head meta[property="og:locale"]')).toHaveAttribute("content", english ? "en_US" : "tr_TR");
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute(
    "content",
    english ? "GPU Kernel Atlas — GPU Kernel Engineering" : "GPU Kernel Atlas — GPU Kernel Mühendisliği",
  );
  await expect(page.locator('head meta[property="og:description"]')).toHaveAttribute("content", english ? "12 atlases · 12 weeks · One learning system" : "12 atlas · 12 hafta · Tek öğrenme sistemi");
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute(
    "content",
    english ? "https://gpu.aserdargun.com/og-en.png" : "https://gpu.aserdargun.com/og.png",
  );
  await expect(page.locator('head meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    english ? "GPU Kernel Atlas — GPU Kernel Engineering" : "GPU Kernel Atlas — GPU Kernel Mühendisliği",
  );
  await expect(page.locator('head meta[name="twitter:description"]')).toHaveAttribute("content", english ? "12 atlases · 12 weeks · One learning system" : "12 atlas · 12 hafta · Tek öğrenme sistemi");
  await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    english ? "https://gpu.aserdargun.com/og-en.png" : "https://gpu.aserdargun.com/og.png",
  );
}

async function openModule(page: Page, locale: "tr" | "en", moduleId: (typeof moduleIds)[number]) {
  await gotoAtlas(page, locale);
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 820) {
    await page.getByTestId("atlas-menu-button").click();
    await page.getByTestId("atlas-drawer").locator(".atlas-module-nav button").nth(moduleIds.indexOf(moduleId)).click();
  } else {
    await page.locator(".atlas-sidebar").getByTestId(`atlas-module-${moduleId}`).click();
  }
  await expect(page.locator(moduleRoots[moduleId])).toBeVisible();
}

async function collectGeometryIssues(page: Page) {
  return page.evaluate(() => {
    const tolerance = 1;
    const issues: string[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const labelFor = (element: HTMLElement) => {
      const direct = element.getAttribute("aria-label")?.trim();
      if (direct) return direct;
      const references = element.getAttribute("aria-labelledby")?.trim().split(/\s+/).filter(Boolean) ?? [];
      return references.map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join(" ").trim();
    };
    const rendered = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" &&
        Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0 &&
        !element.closest('[aria-hidden="true"], .atlas-visually-hidden');
    };
    const isMeaningful = (element: HTMLElement) => {
      if (element.matches("button, a[href], input, select, textarea, table, pre, code, svg, canvas, img")) return true;
      return /[\p{L}\p{N}]/u.test(element.textContent ?? "");
    };
    const selectorFor = (element: HTMLElement) => {
      if (element.id) return `#${element.id}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid=${testId}]`;
      const classes = [...element.classList].slice(0, 2).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
    };
    const allElements = [...document.querySelectorAll<HTMLElement>("body *")].filter(rendered);
    const scrollers = allElements.filter((element) => {
      const overflowX = getComputedStyle(element).overflowX;
      return /^(auto|scroll)$/.test(overflowX) && element.scrollWidth > element.clientWidth + tolerance;
    });
    const enclosingScroller = (element: HTMLElement) => scrollers.find((scroller) => scroller !== element && scroller.contains(element));

    if (document.documentElement.scrollWidth > viewportWidth + tolerance) {
      issues.push(`document overflow ${document.documentElement.scrollWidth}>${viewportWidth}`);
    }

    for (const scroller of scrollers) {
      const selector = selectorFor(scroller);
      if (scroller.tabIndex < 0) issues.push(`${selector} internal scroller is not keyboard reachable`);
      if (!labelFor(scroller)) issues.push(`${selector} internal scroller has no accessible name`);
      const original = scroller.scrollLeft;
      scroller.scrollLeft = 0;
      const before = scroller.scrollLeft;
      scroller.scrollLeft = scroller.scrollWidth;
      if (scroller.scrollLeft <= before) issues.push(`${selector} internal scroller cannot advance`);
      scroller.scrollLeft = original;
    }

    for (const element of allElements) {
      if (!isMeaningful(element)) continue;
      const selector = selectorFor(element);
      const rect = element.getBoundingClientRect();
      if (!enclosingScroller(element) && (rect.left < -tolerance || rect.right > viewportWidth + tolerance)) {
        issues.push(`${selector} escapes viewport horizontally (${rect.left.toFixed(1)}..${rect.right.toFixed(1)})`);
      }
      let ancestor = element.parentElement;
      let horizontalBoundsOwnedByScroller = false;
      while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
        const style = getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        if (!horizontalBoundsOwnedByScroller && /^(hidden|clip)$/.test(style.overflowX) &&
            (rect.left < ancestorRect.left - tolerance || rect.right > ancestorRect.right + tolerance)) {
          issues.push(`${selector} clipped horizontally by ${selectorFor(ancestor)} (${style.overflowX})`);
          break;
        }
        if (/^(hidden|clip)$/.test(style.overflowY) &&
            (rect.top < ancestorRect.top - tolerance || rect.bottom > ancestorRect.bottom + tolerance)) {
          issues.push(`${selector} clipped vertically by ${selectorFor(ancestor)} (${style.overflowY})`);
          break;
        }
        if (scrollers.includes(ancestor)) horizontalBoundsOwnedByScroller = true;
        ancestor = ancestor.parentElement;
      }
    }
    return [...new Set(issues)];
  });
}

async function tabTo(page: Page, locator: ReturnType<Page["locator"]>, maxTabs = 300, direction: "forward" | "backward" = "forward") {
  await expect(locator).toHaveCount(1);
  for (let index = 0; index <= maxTabs; index += 1) {
    if (await locator.evaluate((element) => document.activeElement === element)) return;
    await page.keyboard.press(direction === "forward" ? "Tab" : "Shift+Tab");
  }
  throw new Error(`Tab navigation did not reach ${await locator.evaluate((element) => element.outerHTML.slice(0, 180))}`);
}

async function expectVisibleKeyboardFocus(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  visualTarget = locator,
  hitTarget = visualTarget,
  minimumSize = 44,
) {
  await tabTo(page, locator);
  await expect(locator).toBeFocused();
  const focus = await visualTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), boxShadow: style.boxShadow };
  });
  expect((focus.outlineStyle !== "none" && focus.outlineWidth >= 2) || focus.boxShadow !== "none").toBe(true);
  const target = await hitTarget.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(target.width).toBeGreaterThanOrEqual(minimumSize);
  expect(target.height).toBeGreaterThanOrEqual(minimumSize);
}

async function expectVisibleKeyboardFocusRing(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  direction: "forward" | "backward" = "forward",
) {
  await tabTo(page, locator, 300, direction);
  await expect(locator).toBeFocused();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    let background: Element | null = element;
    let backgroundColor = "rgba(0, 0, 0, 0)";
    while (background) {
      backgroundColor = getComputedStyle(background).backgroundColor;
      if (!/rgba\([^)]*(?:,|\/)\s*0(?:\.0+)?\s*\)/i.test(backgroundColor)) break;
      background = background.parentElement;
    }
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      backgroundColor,
    };
  });
  const transparent = (value: string) => value === "transparent" || /rgba\([^)]*(?:,|\/)\s*0(?:\.0+)?\s*\)/i.test(value);
  const rgb = (value: string) => value.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i)?.slice(1, 4).map(Number);
  const luminance = (color: number[]) => color.map((channel) => channel / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const contrast = (foreground: string) => { const fg = rgb(foreground); const bg = rgb(focus.backgroundColor); if (!fg || !bg) return 0; const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a); return (light + .05) / (dark + .05); };
  const visibleOutline = focus.outlineStyle !== "none" && focus.outlineWidth >= 2 && !transparent(focus.outlineColor) && contrast(focus.outlineColor) > 1.1;
  const visibleShadow = focus.boxShadow !== "none" && !transparent(focus.boxShadow) && /\b(?:[2-9]|\d{2,})(?:\.\d+)?px\b/.test(focus.boxShadow) && contrast(focus.boxShadow) > 1.1;
  const diagnostic = await locator.evaluate((element) => element.outerHTML.slice(0, 220));
  expect(visibleOutline || visibleShadow, `${diagnostic} ${JSON.stringify(focus)}`).toBe(true);
}

async function activateButtonStateAndVerify(
  button: StateLocator,
  target: StateSignatureTarget,
  signal: "selection" | "toggle" = "selection",
) {
  await expectSignatureTargetExcludesControl(button, target);
  const before = await stateSignature(target);
  const pressedBefore = await button.getAttribute("aria-pressed");
  await button.click();
  const pressedAfter = await button.getAttribute("aria-pressed");
  expect(pressedBefore, "stateful button must expose aria-pressed").not.toBeNull();
  if (signal === "selection") expect(pressedAfter).toBe("true");
  else expect(pressedAfter).not.toBe(pressedBefore);
  const after = await stateSignature(target);
  expect(after, "state-specific panel did not change").not.toBe(before);
  return { before, after };
}

async function expectEveryActualScrollerKeyboardFocus(
  page: Page,
  root: ReturnType<Page["locator"]>,
  expectAtLeastOne = true,
  context = "rendered state",
) {
  const candidates = root.locator('[tabindex="0"]');
  const actualIndices = await candidates.evaluateAll((elements) => elements.flatMap((element, index) => {
    const node = element as HTMLElement;
    const style = getComputedStyle(node);
    const horizontal = /^(auto|scroll)$/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
    const vertical = /^(auto|scroll)$/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    return horizontal || vertical ? [index] : [];
  }));
  if (expectAtLeastOne) expect(actualIndices.length, `${context}: expected at least one actual overflow scroller`).toBeGreaterThan(0);
  for (let position = 0; position < actualIndices.length; position += 1) {
    await expectVisibleKeyboardFocusRing(page, candidates.nth(actualIndices[position]), position % 2 === 0 ? "forward" : "backward");
  }
  return actualIndices.length;
}

async function expectStateGeometry(
  page: Page,
  moduleId: (typeof moduleIds)[number],
  runtimeErrors: string[],
) {
  await expect(page.locator(moduleRoots[moduleId])).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByTestId("atlas-complete")).toBeVisible();
  await expect(page.getByTestId("atlas-next")).toBeVisible();
  expect(await collectGeometryIssues(page)).toEqual([]);
  expect(runtimeErrors).toEqual([]);
}

async function activateEveryButton(
  page: Page,
  buttons: StateLocator,
  target: StateSignatureTarget,
  moduleId: (typeof moduleIds)[number],
  runtimeErrors: string[],
  signal: "selection" | "toggle" = "selection",
) {
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  const initiallyActive = signal === "selection"
    ? (await buttons.evaluateAll((elements) => elements.findIndex((element) => element.getAttribute("aria-pressed") === "true")))
    : -1;
  const order = Array.from({ length: count }, (_, index) => index)
    .filter((index) => index !== initiallyActive);
  if (initiallyActive >= 0) order.push(initiallyActive);
  for (const index of order) {
    const button = buttons.nth(index);
    await activateButtonStateAndVerify(button, target, signal);
    await expectStateGeometry(page, moduleId, runtimeErrors);
  }
}

async function activateEverySelectOption(
  page: Page,
  select: StateLocator,
  target: StateSignatureTarget,
  moduleId: (typeof moduleIds)[number],
  runtimeErrors: string[],
) {
  const values = await select.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(values.length).toBeGreaterThan(1);
  const initialValue = await select.inputValue();
  const order = values.filter((value) => value !== initialValue);
  if (values.includes(initialValue)) order.push(initialValue);
  for (const value of order) {
    await expectSignatureTargetExcludesControl(select, target);
    const before = await stateSignature(target);
    await select.selectOption(value);
    await expect(select).toHaveValue(value);
    const after = await stateSignature(target);
    expect(after, `state-specific panel did not change for select option ${value}`).not.toBe(before);
    await expectStateGeometry(page, moduleId, runtimeErrors);
  }
}

async function expectSignatureTargetExcludesControl(control: StateLocator, target: StateSignatureTarget) {
  const controlHandle = await control.elementHandle();
  expect(controlHandle, "activating control must resolve before signature validation").not.toBeNull();
  const targetHandles = await signatureLocator(target).elementHandles();
  expect(targetHandles.length, "state signature target must resolve downstream content").toBeGreaterThan(0);
  for (const targetHandle of targetHandles) {
    const containsControl = await targetHandle.evaluate(
      (element, activatingControl) => element === activatingControl || element.contains(activatingControl as Node),
      controlHandle,
    );
    expect(containsControl, "signature target contains the activating control").toBe(false);
  }
}

async function stateSignature(target: StateSignatureTarget) {
  if ("read" in target) return target.read();
  return target.evaluateAll((elements) => elements.map((element) => {
    const node = element as HTMLElement;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return "";
    const semanticValues = [node, ...node.querySelectorAll<HTMLElement>("output, [aria-valuenow], [aria-valuetext], [data-mode], [data-strategy]")]
      .map((part) => [
        part.getAttribute("aria-valuenow"),
        part.getAttribute("aria-valuetext"),
        part.getAttribute("data-mode"),
        part.getAttribute("data-strategy"),
        part instanceof HTMLInputElement || part instanceof HTMLSelectElement ? part.value : "",
        part instanceof HTMLOutputElement ? part.value : "",
        part.getAttribute("style"),
      ].join("|"))
      .join("\n");
    return [node.innerText, semanticValues, style.opacity, style.transform].join("\n===\n");
  }).filter(Boolean).join("\n---\n"));
}

async function activateSingleSelection(
  page: Page,
  button: StateLocator,
  target: StateSignatureTarget,
  moduleId: (typeof moduleIds)[number],
  runtimeErrors: string[],
) {
  await activateButtonStateAndVerify(button, target);
  await expectStateGeometry(page, moduleId, runtimeErrors);
}

async function exerciseLayoutStates(
  page: Page,
  moduleId: (typeof moduleIds)[number],
  runtimeErrors: string[],
) {
  const root = page.locator(moduleRoots[moduleId]);
  if (moduleId === "visual") {
    const sections = root.locator(".vf-module-nav > button");
    const panel = root.locator(".vf-page-shell > .vf-section");
    const count = await sections.count();
    expect(count).toBe(12);
    for (let index = 0; index < count; index += 1) {
      const before = await stateSignature(panel);
      await sections.nth(index).click();
      await expect(sections.nth(index)).toHaveAttribute("aria-current", "page");
      if (index !== 0) expect(await stateSignature(panel)).not.toBe(before);
      await expectStateGeometry(page, moduleId, runtimeErrors);
    }
    return;
  }
  if (moduleId === "toolchain") {
    const views = root.locator(":scope > .topbar [role=group] > button");
    const visibleView = root.locator(":scope > .app-shell > .content > *");
    await activateEveryButton(page, views, visibleView, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".sidebar > .track-item"), root.locator(".section-heading, .lesson-grid"), moduleId, runtimeErrors);
    await activateSingleSelection(page, views.nth(1), visibleView, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".lab-tabs > button"), root.locator(".editor-pane"), moduleId, runtimeErrors);
    await activateSingleSelection(page, views.nth(2), visibleView, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".filter-row > button"), root.locator(".question-list"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "architecture") {
    const tabs = root.locator(":scope > .tabs > button");
    const activePanel = root.locator(":scope > .panel-stack");
    await activateEveryButton(page, tabs, activePanel, moduleId, runtimeErrors);
    await activateSingleSelection(page, tabs.nth(1), activePanel, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".choice-rail > button"), root.locator(".arch-stage"), moduleId, runtimeErrors);
    await activateSingleSelection(page, tabs.nth(2), activePanel, moduleId, runtimeErrors);
    const simtResult = root.locator(".lane-grid, .path-strip, .simt-layout > .detail-card");
    await activateEverySelectOption(page, root.locator(".controls select"), customStateSignature(simtResult, async () => {
      const lanes = await root.locator(".lane-grid .lane").evaluateAll((elements) => elements.map((element) => [
        element.getAttribute("aria-label"),
        getComputedStyle(element).backgroundColor,
        getComputedStyle(element).opacity,
      ].join("|")));
      return `${lanes.join("\n")}\n${await root.locator(".path-strip, .simt-layout > .detail-card").allInnerTexts()}`;
    }), moduleId, runtimeErrors);
    await activateSingleSelection(page, tabs.nth(3), activePanel, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".memory-stack > button"), root.locator(".memory-stack .detail-card"), moduleId, runtimeErrors);
    await activateEverySelectOption(page, root.locator(".select-label select"), root.locator(".coalesce-stage .stats, .address-grid, .sector-grid, .coalesce-stage > .muted"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "memory") {
    const nav = root.locator(".module-nav > button");
    const activeModule = root.locator(":scope > .page-shell > .module-layout");
    await activateEveryButton(page, nav, activeModule, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".hierarchy-stack > button"), root.locator(".selected-detail"), moduleId, runtimeErrors);
    await activateSingleSelection(page, nav.nth(1), activeModule, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".segmented-control > button"), root.locator(".transaction-map, .lab-caption"), moduleId, runtimeErrors);
    await activateSingleSelection(page, nav.nth(2), activeModule, moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".stride-control > button"), root.locator(".mapping-equation, .bank-explanation"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "triton") {
    await activateEveryButton(page, root.locator(".week-rail > button"), root.locator(".week-detail"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".file-tabs > button"), root.locator(".editor-pane"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "operators") {
    await activateEveryButton(page, root.locator(".topic-rail > button"), root.locator(".hero-copy"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "correctness") {
    await activateEveryButton(page, root.locator(".scenario-tabs > button"), root.locator(".tolerance-lab .number-pair, .tolerance-lab .formula-row, .tolerance-lab .lab-note"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".tool-tabs > button"), root.locator(".tool-body"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "profiling") {
    await activateEveryButton(page, root.locator(".lens-switch > button"), root.locator(".lens-display"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".scenario-tabs > button"), root.locator(".timeline-card"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".mode-buttons > button"), root.locator(".diagnosis-content"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".command-tabs > button"), root.locator(".command-body"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "cutlass") {
    await activateEveryButton(page, root.locator(".tabs > button"), root.locator(".code"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "inference") {
    await activateEveryButton(page, root.locator(".lab-panel .controls > button"), root.locator(".result-board"), moduleId, runtimeErrors, "toggle");
    await activateEveryButton(page, root.locator(".memory-calc .segmented > button"), root.locator(".memory-output"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".goal-tabs > button"), root.locator(".recommendation"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".detective-menu > button"), root.locator(".diagnosis"), moduleId, runtimeErrors);
    return;
  }
  if (moduleId === "multigpu") {
    await activateEveryButton(page, root.locator(".collective-card .segmented > button"), root.locator(".ring-stage, .explain-card"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".strategy-tabs > button"), root.locator(".strategy-detail"), moduleId, runtimeErrors);
    return;
  }
  await activateEveryButton(page, root.locator(".decision-strip .segmented > button"), root.locator(".decision-output"), moduleId, runtimeErrors);
  const tracks = root.locator(".track-tabs > button");
  const trackCount = await tracks.count();
  const initialTrack = await tracks.evaluateAll((elements) => elements.findIndex((element) => element.getAttribute("aria-pressed") === "true"));
  const trackOrder = Array.from({ length: trackCount }, (_, index) => index).filter((index) => index !== initialTrack);
  if (initialTrack >= 0) trackOrder.push(initialTrack);
  for (const index of trackOrder) {
    await activateSingleSelection(page, tracks.nth(index), root.locator(".track-intro, .pipeline-panel"), moduleId, runtimeErrors);
    await activateEveryButton(page, root.locator(".pipeline-steps > button"), root.locator(".step-detail"), moduleId, runtimeErrors);
  }
  for (const select of await root.locator(".lab-controls select").all()) {
    await activateEverySelectOption(page, select, root.locator(".lab-output"), moduleId, runtimeErrors);
  }
  const fusion = root.getByRole("switch");
  const beforeChecked = await fusion.getAttribute("aria-checked");
  const beforeOutput = await stateSignature(root.locator(".lab-output"));
  await fusion.click();
  expect(await fusion.getAttribute("aria-checked")).not.toBe(beforeChecked);
  expect(await stateSignature(root.locator(".lab-output"))).not.toBe(beforeOutput);
  await expectStateGeometry(page, moduleId, runtimeErrors);
}

async function activateRepresentativeScrollerStates(
  page: Page,
  moduleId: (typeof moduleIds)[number],
  check: () => Promise<void>,
) {
  const root = page.locator(moduleRoots[moduleId]);
  const click = async (locator: ReturnType<Page["locator"]>) => {
    await locator.click();
    await check();
  };
  const selectLast = async (locator: ReturnType<Page["locator"]>) => {
    const count = await locator.locator("option").count();
    await locator.selectOption({ index: count - 1 });
    await check();
  };

  if (moduleId === "toolchain") {
    const views = root.locator(":scope > .topbar [role=group] > button");
    await click(views.nth(0));
    await click(root.locator(".sidebar > .track-item").last());
    await click(views.nth(1));
    await click(root.locator(".lab-tabs > button").last());
    await click(views.nth(2));
    await click(root.locator(".filter-row > button").last());
    return;
  }
  if (moduleId === "architecture") {
    const tabs = root.locator(":scope > .tabs > button");
    await click(tabs.nth(1));
    await click(root.locator(".choice-rail > button").last());
    await click(tabs.nth(2));
    await selectLast(root.locator(".controls select"));
    await click(tabs.nth(3));
    await click(root.locator(".memory-stack > button").last());
    await selectLast(root.locator(".select-label select"));
    return;
  }
  if (moduleId === "memory") {
    const nav = root.locator(".module-nav > button");
    await click(nav.nth(0));
    await click(root.locator(".hierarchy-stack > button").last());
    await click(nav.nth(1));
    await click(root.locator(".segmented-control > button").last());
    await click(nav.nth(2));
    await click(root.locator(".stride-control > button").last());
    return;
  }
  const groups: Partial<Record<(typeof moduleIds)[number], string[]>> = {
    triton: [".week-rail > button", ".file-tabs > button"],
    operators: [".topic-rail > button"],
    correctness: [".scenario-tabs > button", ".tool-tabs > button"],
    profiling: [".lens-switch > button", ".scenario-tabs > button", ".mode-buttons > button", ".command-tabs > button"],
    cutlass: [".tabs > button"],
    inference: [".lab-panel .controls > button", ".memory-calc .segmented > button", ".goal-tabs > button", ".detective-menu > button"],
    multigpu: [".collective-card .segmented > button", ".strategy-tabs > button"],
    systems: [".decision-strip .segmented > button", ".track-tabs > button", ".pipeline-steps > button"],
  };
  for (const selector of groups[moduleId] ?? []) await click(root.locator(selector).last());
  if (moduleId === "systems") {
    for (const select of await root.locator(".lab-controls select").all()) await selectLast(select);
    await click(root.getByRole("switch"));
  }
}

const task2InteractionCases = [
  {
    locale: "tr" as const,
    viewport: { width: 1440, height: 1000 },
    fieldsEmpty: "0 / 7 alan hazır",
    fieldsReady: "7 / 7 alan hazır",
    capabilityComplete: "Yetenek kaydı tamamlandı.",
    cudaUnsupported: "TMA · desteklenmiyor",
    cudaApplicable: "TMA · uygulanabilir",
    cudaReason: "TMA bulk tensor kopyaları Hopper / SM90 ve daha yeni compute capability gerektirir.",
    cudaSupportedDetail: "Bulk asenkron tensor kopyası ve tensor map tanımlayıcıları bu mimari yolunda kullanılabilir.",
    memoryAda: "Ada SM89",
    memoryHopper: "Hopper SM90",
    memoryBlackwell: "Blackwell SM100 ailesi",
    memoryHopperReason: "Bu özellik Hopper / SM90 ve daha yeni bir compute capability gerektirir.",
    memoryTmemReason: "TMEM bu atlas kapsamında Blackwell'e özgüdür; Ada veya Hopper için donanım sonucu üretilemez.",
    memoryNoResult: "Bu seçim ölçülmüş veya simüle edilmiş bir donanım sonucu üretmez.",
    memorySupportedDetail: "TMA ile büyük 1D veya çok boyutlu aktarımlar; tamamlanma bariyer/proxy kurallarıyla izlenir.",
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    fieldsEmpty: "0 / 7 fields ready",
    fieldsReady: "7 / 7 fields ready",
    capabilityComplete: "Capability record complete.",
    cudaUnsupported: "TMA · unsupported",
    cudaApplicable: "TMA · applicable",
    cudaReason: "TMA bulk tensor copies require Hopper / SM90 or a newer compute capability.",
    cudaSupportedDetail: "Bulk-asynchronous tensor copy and tensor-map descriptors are available on this architecture path.",
    memoryAda: "Ada SM89",
    memoryHopper: "Hopper SM90",
    memoryBlackwell: "Blackwell SM100 family",
    memoryHopperReason: "This feature requires Hopper / SM90 or a newer compute capability.",
    memoryTmemReason: "TMEM is Blackwell-specific in this atlas; no hardware result can be produced for Ada or Hopper.",
    memoryNoResult: "This choice does not produce a measured or simulated hardware result.",
    memorySupportedDetail: "TMA moves large 1D or multidimensional regions; barriers and proxy rules track completion.",
  },
] as const;

for (const task2Case of task2InteractionCases) {
  test(`Task 2 foundations interaction ${task2Case.locale} keeps machine details component-only`, async ({ page }) => {
    await page.setViewportSize(task2Case.viewport);
    await openModule(page, task2Case.locale, "toolchain");
    const artifact = page.locator(".kernel-forge-surface .capability-artifact");
    const inputs = artifact.locator(".capability-fields input");
    const status = artifact.locator("output");
    const machineDetails = [
      `qa-${task2Case.locale}-gpu-h100`,
      `qa-${task2Case.locale}-cc-90`,
      `qa-${task2Case.locale}-driver-580`,
      `qa-${task2Case.locale}-cuda-133`,
      `qa-${task2Case.locale}-framework-213`,
      `qa-${task2Case.locale}-flags-sm90`,
      `qa-${task2Case.locale}-benchmark-ncu`,
    ];

    await expect(inputs).toHaveCount(7);
    await expect(status).toHaveText(task2Case.fieldsEmpty);
    for (let index = 0; index < machineDetails.length; index += 1) await inputs.nth(index).fill(machineDetails[index]);
    await expect(status).toHaveText(task2Case.fieldsReady);
    await expect(artifact.locator(".capability-verdict strong")).toHaveText(task2Case.capabilityComplete);

    const readClientPersistence = () => page.evaluate(() => ({
      localStorage: JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
      sessionStorage: JSON.stringify(Object.fromEntries(Object.entries(sessionStorage))),
      cookie: document.cookie,
    }));
    for (const [surface, persisted] of Object.entries(await readClientPersistence())) {
      for (const detail of machineDetails) expect(persisted, `${surface} leaked ${detail}`).not.toContain(detail);
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
    await openModule(page, task2Case.locale, "toolchain");
    await expect(artifact).toBeVisible();
    await expect(status).toHaveText(task2Case.fieldsEmpty);
    expect(await inputs.evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value))).toEqual(["", "", "", "", "", "", ""]);
    for (const [surface, persisted] of Object.entries(await readClientPersistence())) {
      for (const detail of machineDetails) expect(persisted, `${surface} retained ${detail} after reload`).not.toContain(detail);
    }
  });

  test(`Task 2 CUDA architecture gating ${task2Case.locale} follows real architecture controls`, async ({ page }) => {
    await page.setViewportSize(task2Case.viewport);
    await openModule(page, task2Case.locale, "architecture");
    const bridge = page.locator(".cuda-simt-surface .tile-bridge");
    const picker = bridge.locator(".architecture-picker");
    const status = bridge.locator('.tile-bridge-notes [aria-live="polite"]');
    const architectureButtons = picker.getByRole("button");
    const path = [
      { name: "Ada · SM89", pressed: ["true", "false", "false"], className: /unsupported/, status: task2Case.cudaUnsupported, detail: task2Case.cudaReason },
      { name: "Hopper · SM90", pressed: ["false", "true", "false"], className: /supported/, status: task2Case.cudaApplicable, detail: task2Case.cudaSupportedDetail },
      { name: "Blackwell", pressed: ["false", "false", "true"], className: /supported/, status: task2Case.cudaApplicable, detail: task2Case.cudaSupportedDetail },
    ];

    await expect(architectureButtons).toHaveCount(3);
    await expect(status).toHaveAttribute("aria-live", "polite");
    for (const step of path) {
      await picker.getByRole("button", { name: step.name, exact: true }).click();
      expect(await architectureButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(step.pressed);
      await expect(status).toHaveClass(step.className);
      await expect(status).toContainText(step.status);
      await expect(status).toContainText(step.detail);
    }
  });

  test(`Task 2 memory architecture gating ${task2Case.locale} enforces the real feature matrix`, async ({ page }) => {
    await page.setViewportSize(task2Case.viewport);
    await openModule(page, task2Case.locale, "memory");
    const gate = page.locator(".gpu-memory-surface .architecture-memory-gate");
    const picker = gate.locator(".architecture-selector");
    const architectureButtons = picker.getByRole("button");
    const featureButtons = gate.locator(".memory-feature-grid button");
    const detail = gate.locator(".memory-feature-detail");
    const path = [
      { name: task2Case.memoryAda, pressed: ["true", "false", "false"], disabled: [true, true, true, true], disabledCount: 4 },
      { name: task2Case.memoryHopper, pressed: ["false", "true", "false"], disabled: [false, false, false, true], disabledCount: 1 },
      { name: task2Case.memoryBlackwell, pressed: ["false", "false", "true"], disabled: [false, false, false, false], disabledCount: 0 },
    ];

    await expect(architectureButtons).toHaveCount(3);
    await expect(featureButtons).toHaveCount(4);
    for (const step of path) {
      await picker.getByRole("button", { name: step.name, exact: true }).click();
      expect(await architectureButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(step.pressed);
      expect(await featureButtons.evaluateAll((buttons) => buttons.map((button) => (button as HTMLButtonElement).disabled))).toEqual(step.disabled);
      expect(await featureButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-disabled") === "true"))).toEqual(step.disabled);
      await expect(gate.locator(".memory-feature-grid button:disabled")).toHaveCount(step.disabledCount);
      await expect(gate.locator('.memory-feature-grid button[aria-disabled="true"]')).toHaveCount(step.disabledCount);
      await expect(detail).toContainText(task2Case.memoryNoResult);

      const disabledButtons = gate.locator(".memory-feature-grid button:disabled");
      for (let index = 0; index < await disabledButtons.count(); index += 1) {
        const button = disabledButtons.nth(index);
        const reasonId = await button.getAttribute("aria-describedby");
        expect(reasonId).toBeTruthy();
        await expect(gate.locator(`#${reasonId}`)).toBeVisible();
      }
      if (step.name === task2Case.memoryAda) {
        await expect(gate.locator("#memory-feature-asyncBulk-reason")).toHaveText(task2Case.memoryHopperReason);
        await expect(gate.locator("#memory-feature-tmem-reason")).toHaveText(task2Case.memoryTmemReason);
      }
      if (step.name === task2Case.memoryHopper) {
        await expect(gate.locator("#memory-feature-tmem-reason")).toHaveText(task2Case.memoryTmemReason);
      }
    }

    await featureButtons.nth(0).click();
    await expect(featureButtons.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(detail).toContainText(task2Case.memorySupportedDetail);
  });
}

const task3InteractionCases = [
  {
    locale: "tr" as const,
    viewport: { width: 1440, height: 1000 },
    tritonOp: "torch.library.triton_op + wrap_triton",
    tritonResult: "PyTorch alt sistemleriyle bileşir",
    preview: "Önizleme",
    previewCaveat: "zorunlu mezuniyet koşulu değildir",
    branchRuns: ["Yerleşik bileşim", "Düz Triton", "triton_op", "custom_op"],
    grouped: "Gruplu GEMM / MoE",
    precision: "Block-scaled FP4 / FP8",
    ada: "Ada · SM89",
    blackwell: "Blackwell · SM100 ailesi",
    nondeterministic: "Nondeterministik",
    nondeterministicResult: "dağılım",
    current: "Güncel",
    applicability: "Donanım uygulanabilirliği",
    plainAot: "AOTInductor ile uygun",
    plainCaveat: "PyTorch alt sistemleriyle bileşim",
    pagedCaveat: "tarihsel tasarım özeti",
    gqaCaveat: "deneysel özellik",
    gqaFreshness: "API sayfası günceldir",
    gqaCompletion: "temel tamamlanma koşulu değildir",
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    tritonOp: "torch.library.triton_op + wrap_triton",
    tritonResult: "composes with PyTorch subsystems",
    preview: "Preview",
    previewCaveat: "not a core completion requirement",
    branchRuns: ["Built-in composition", "Plain Triton", "triton_op", "custom_op"],
    grouped: "Grouped GEMM / MoE",
    precision: "Block-scaled FP4 / FP8",
    ada: "Ada · SM89",
    blackwell: "Blackwell · SM100 family",
    nondeterministic: "Nondeterministic",
    nondeterministicResult: "distribution",
    current: "Current",
    applicability: "Hardware applicability",
    plainAot: "Supported by AOTInductor",
    plainCaveat: "PyTorch subsystem composability",
    pagedCaveat: "historical design overview",
    gqaCaveat: "experimental feature",
    gqaFreshness: "API page is current",
    gqaCompletion: "not a core completion requirement",
  },
] as const;

for (const task3Case of task3InteractionCases) {
  test(`Task 3 PyTorch decision and autotune interaction ${task3Case.locale} follows real controls`, async ({ page }) => {
    await page.setViewportSize(task3Case.viewport);
    await openModule(page, task3Case.locale, "triton");
    const matrix = page.locator(".pytorch-triton-surface .integration-decision-matrix");
    const decisions = matrix.locator(".decision-options button");
    const result = matrix.locator('.decision-result[aria-live="polite"]');
    const autotune = matrix.locator(".autotune-select");
    const autotuneResult = matrix.locator('.autotune-result[aria-live="polite"]');
    const branchCode = matrix.locator(".integration-code");
    const branchEffect = matrix.locator('.branch-config-effect[aria-live="polite"]');
    const acceptanceRows = matrix.locator(".acceptance-row");
    const runButton = page.locator(".pytorch-triton-surface .run-button");
    const runContext = page.locator(".pytorch-triton-surface .run-context");
    const expectedStatusSignatures = [
      ["covered", "not-applicable", "owned", "owned", "visible"],
      ["required", "required", "not-applicable", "manual", "supported"],
      ["required", "required", "required", "required", "visible"],
      ["required", "required", "required", "required", "opaque"],
    ];
    const codeTokens = [/return x \+ y/, /add_kernel\[grid\]/, /torch\.library\.triton_op/, /torch\.library\.custom_op/];

    await expect(decisions).toHaveCount(4);
    await expect(acceptanceRows).toHaveCount(5);
    for (let index = 0; index < 4; index += 1) {
      await decisions.nth(index).click();
      const expectedPressed = ["false", "false", "false", "false"];
      expectedPressed[index] = "true";
      expect(await decisions.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(expectedPressed);
      await expect(branchCode).toContainText(codeTokens[index]);
      expect(await acceptanceRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-status")))).toEqual(expectedStatusSignatures[index]);
      if (index === 1) {
        await expect(acceptanceRows.last()).toContainText(task3Case.plainAot);
        await expect(result).toContainText(task3Case.plainCaveat);
        await expect(result).toContainText("triton_op + wrap_triton");
      }
      await runButton.click();
      await expect(runContext).toHaveAttribute("data-branch", ["composition", "plain-triton", "triton-op", "custom-op"][index]);
      await expect(runContext).toContainText(task3Case.branchRuns[index]);
    }
    await matrix.getByRole("button", { name: task3Case.tritonOp, exact: true }).click();
    await expect(result).toContainText(task3Case.tritonResult);
    await autotune.selectOption("latency");
    await expect(branchCode).toContainText("BLOCK_SIZE=128");
    await expect(branchEffect).toContainText("BLOCK_SIZE=128");
    await autotune.selectOption("throughput");
    await expect(autotune).toHaveValue("throughput");
    await expect(autotuneResult).toContainText("BLOCK_SIZE=512");
    await expect(branchCode).toContainText("BLOCK_SIZE=512");
    await expect(branchEffect).toContainText("BLOCK_SIZE=512");
    await runButton.click();
    await expect(runContext).toContainText("BLOCK_SIZE=512");
    await expect(matrix.locator(".boundary-list")).toContainText(/opcheck/i);
    await expect(matrix.locator(".boundary-list")).toContainText(/registration|kayıt/i);
    await expect(matrix.locator(".boundary-list")).toContainText(/numerical|sayısal/i);
    await expect(matrix.locator(".boundary-list")).toContainText(/gradient|gradyan/i);
    await expect(matrix.locator(".boundary-list")).toContainText(/AOTInductor/i);
    await expect(matrix.locator('.preview-panel[data-source-id="triton-gluon"]')).toContainText(task3Case.preview);
    await expect(matrix.locator('.preview-panel[data-source-id="triton-gluon"]')).toContainText(task3Case.previewCaveat);
    await expectNoDocumentOverflow(page);
  });

  test(`Task 3 operator topics and quiz reset ${task3Case.locale} follow real state`, async ({ page }) => {
    await page.setViewportSize(task3Case.viewport);
    await openModule(page, task3Case.locale, "operators");
    const root = page.locator(".llm-kernel-patterns-surface");
    const topics = root.locator(".topic-rail button");
    const quizButtons = root.locator(".quiz-options button");
    const feedback = root.locator(".quiz-note");

    await expect(topics).toHaveCount(7);
    await quizButtons.first().click();
    await expect(feedback).not.toHaveText("");
    await root.getByRole("button", { name: new RegExp(task3Case.grouped) }).click();
    await expect(root.locator(".hero-copy")).toContainText(task3Case.grouped);
    await expect(feedback).toHaveText("");
    expect(await quizButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(["false", "false", "false"]);
    const tritonSource = root.locator('.operator-current-scope[data-source-id="triton-operator-tutorials"]');
    await expect(tritonSource).toContainText(task3Case.current);
    await expect(tritonSource).toContainText(/Grouped GEMM|Gruplu GEMM/);
    await expect(tritonSource).toContainText(/persistent matmul/i);
    await expect(tritonSource).toContainText(/block-scaled/i);
    await expect(tritonSource).not.toContainText(/paged|GQA/i);
    const pagedSource = root.locator('.decode-source-evidence [data-source-id="vllm-paged-attention-design"]');
    const gqaSource = root.locator('.decode-source-evidence [data-source-id="pytorch-sdpa-gqa"]');
    await expect(pagedSource).toHaveAttribute("data-maturity", "current");
    await expect(pagedSource).toContainText(task3Case.current);
    await expect(pagedSource).toContainText("vLLM Paged Attention Design");
    await expect(pagedSource).toContainText(new RegExp(task3Case.pagedCaveat, "i"));
    await expect(pagedSource.locator("a")).toHaveAttribute("href", "https://docs.vllm.ai/en/latest/design/paged_attention/");
    await expect(gqaSource).toHaveAttribute("data-maturity", "preview");
    await expect(gqaSource).toContainText(task3Case.preview);
    await expect(gqaSource).toContainText("PyTorch scaled_dot_product_attention");
    await expect(gqaSource).toContainText("enable_gqa=True");
    await expect(gqaSource).toContainText(new RegExp(task3Case.gqaCaveat, "i"));
    await expect(gqaSource).toContainText(task3Case.gqaFreshness);
    await expect(gqaSource).toContainText(task3Case.gqaCompletion);
    await expect(gqaSource.locator("a")).toHaveAttribute("href", "https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html");

    await root.getByRole("button", { name: new RegExp(task3Case.precision) }).click();
    const gate = root.locator(".operator-architecture-gate");
    const architectureButtons = gate.locator(".architecture-selector button");
    const featureButtons = gate.locator(".operator-feature-grid button");
    const maturity = gate.locator('.maturity-panel[data-source-id="triton-block-scaled"]');
    await expect(maturity).toContainText(task3Case.current);
    await expect(maturity).toContainText(task3Case.applicability);
    await expect(maturity).not.toContainText(task3Case.preview);
    await gate.getByRole("button", { name: task3Case.ada, exact: true }).click();
    expect(await featureButtons.evaluateAll((buttons) => buttons.map((button) => (button as HTMLButtonElement).disabled))).toEqual([false, false, true]);
    await gate.getByRole("button", { name: task3Case.blackwell, exact: true }).click();
    expect(await architectureButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(["false", "false", "true"]);
    expect(await featureButtons.evaluateAll((buttons) => buttons.map((button) => (button as HTMLButtonElement).disabled))).toEqual([false, false, false]);
    await featureButtons.last().click();
    await expect(featureButtons.last()).toHaveAttribute("aria-pressed", "true");
    await expect(gate.locator(".operator-feature-detail")).toContainText(/FP4|FP8/);
    await expectNoDocumentOverflow(page);
  });

  test(`Task 3 correctness classes and architecture gate ${task3Case.locale} follow real controls`, async ({ page }) => {
    await page.setViewportSize(task3Case.viewport);
    await openModule(page, task3Case.locale, "correctness");
    const root = page.locator(".kernel-safety-surface");
    const acceptance = root.locator(".correctness-acceptance-lab");
    const acceptanceButtons = acceptance.locator(".acceptance-class-options button");
    await expect(acceptanceButtons).toHaveCount(3);
    await acceptance.getByRole("button", { name: task3Case.nondeterministic, exact: true }).click();
    expect(await acceptanceButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toEqual(["false", "true", "false"]);
    await expect(acceptance.locator('.acceptance-class-detail[aria-live="polite"]')).toContainText(task3Case.nondeterministicResult);

    const gate = root.locator(".correctness-architecture-gate");
    const tmem = gate.locator(".tmem-gate button");
    await gate.getByRole("button", { name: task3Case.ada, exact: true }).click();
    await expect(tmem).toBeDisabled();
    await expect(tmem).toHaveAttribute("aria-disabled", "true");
    await gate.getByRole("button", { name: task3Case.blackwell, exact: true }).click();
    await expect(tmem).toBeEnabled();
    await tmem.click();
    await expect(tmem).toHaveAttribute("aria-pressed", "true");
    await expect(gate.locator('.tmem-detail[aria-live="polite"]')).toContainText("-g-tmem-access-check");
    await expect(root.locator(".generated-command code")).toHaveText("compute-sanitizer --tool memcheck --show-backtrace yes --error-exitcode 99 ./build/kernel_tests");
    await expectNoDocumentOverflow(page);
  });
}

const task4InteractionCases = [
  {
    locale: "tr" as const,
    viewport: { width: 1440, height: 1000 },
    reportMerge: "Rapor birleştirme",
    clustering: "Kümeleme",
    instructionMix: "Komut karışımı",
    scoreboard: "Scoreboard bağımlılıkları",
    graphNode: "CUDA Graph düğümü",
    reportEvidence: "Birleştirilen rapor",
    clusterEvidence: "Benzer koşular",
    instructionEvidence: "FP/INT/memory",
    scoreboardEvidence: "veri hazır olmadığı için",
    graphEvidence: "seçili kernel düğümü",
    blackwell: "Blackwell · SM100",
    rubin: "Rubin · SM107",
    blackwellEvidence: "tcgen05.mma",
    rubinPreview: "Önizleme",
    rubinCaveat: "R615",
    noGraduation: "temel tamamlanma koşulu değildir",
    cppTemplates: "C++ şablonları",
    cuteDsl: "CuTe DSL",
    legacyGenerator: "Eski Python üreteci",
    cutePreview: "ÖNİZLEME",
    tensorCoreGeneration: "beşinci nesil Tensör Çekirdeği",
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    reportMerge: "Report merge",
    clustering: "Clustering",
    instructionMix: "Instruction mix",
    scoreboard: "Scoreboard dependencies",
    graphNode: "CUDA Graph node",
    reportEvidence: "Merged report",
    clusterEvidence: "Similar runs",
    instructionEvidence: "FP/INT/memory",
    scoreboardEvidence: "data is not ready",
    graphEvidence: "selected kernel node",
    blackwell: "Blackwell · SM100",
    rubin: "Rubin · SM107",
    blackwellEvidence: "tcgen05.mma",
    rubinPreview: "Preview",
    rubinCaveat: "R615",
    noGraduation: "not a core completion requirement",
    cppTemplates: "C++ templates",
    cuteDsl: "CuTe DSL",
    legacyGenerator: "Legacy Python generator",
    cutePreview: "PREVIEW",
    tensorCoreGeneration: "fifth-generation Tensor Core",
  },
] as const;

for (const task4Case of task4InteractionCases) {
  test(`Task 4 Nsight evidence workflow ${task4Case.locale} changes visible report evidence`, async ({ page }) => {
    await page.setViewportSize(task4Case.viewport);
    await openModule(page, task4Case.locale, "profiling");
    const root = page.locator(".nsight-benchmark-surface");
    const workflow = root.locator(".nsight-evidence-workflow");
    const controls = workflow.getByRole("button");
    const evidence = workflow.locator('.nsight-workflow-evidence[aria-live="polite"]');

    await expect(controls).toHaveCount(5);
    await workflow.getByRole("button", { name: task4Case.reportMerge, exact: true }).click();
    await expect(evidence).toHaveAttribute("data-workflow", "report-merge");
    await expect(evidence).toHaveAttribute("data-source-id", "nsight-compute-2026-release");
    await expect(evidence).toContainText(task4Case.reportEvidence);
    await workflow.getByRole("button", { name: task4Case.clustering, exact: true }).click();
    await expect(evidence).toHaveAttribute("data-workflow", "clustering");
    await expect(evidence).toContainText(task4Case.clusterEvidence);
    await workflow.getByRole("button", { name: task4Case.instructionMix, exact: true }).click();
    await expect(evidence).toHaveAttribute("data-workflow", "instruction-mix");
    await expect(evidence).toContainText(task4Case.instructionEvidence);
    await workflow.getByRole("button", { name: task4Case.scoreboard, exact: true }).click();
    await expect(evidence).toHaveAttribute("data-workflow", "scoreboard");
    await expect(evidence).toContainText(task4Case.scoreboardEvidence);
    await workflow.getByRole("button", { name: task4Case.graphNode, exact: true }).click();
    await expect(evidence).toHaveAttribute("data-workflow", "graph-node");
    await expect(evidence).toContainText(task4Case.graphEvidence);
    expect(await controls.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed")))).toContain("true");
    await expectNoDocumentOverflow(page);
  });

  test(`Task 4 CUTLASS evidence and architecture ${task4Case.locale} change visible applicability`, async ({ page }) => {
    await page.setViewportSize(task4Case.viewport);
    await openModule(page, task4Case.locale, "cutlass");
    const root = page.locator(".cutlass-cute-surface");
    const implementation = root.locator(".cutlass-implementation-path");
    const architecture = root.locator(".cutlass-architecture-gate");
    const implementationEvidence = implementation.locator('.cutlass-implementation-evidence[aria-live="polite"]');
    const architectureEvidence = architecture.locator('.cutlass-architecture-evidence[aria-live="polite"]');

    await implementation.getByRole("button", { name: task4Case.cppTemplates, exact: true }).click();
    await expect(implementationEvidence).toHaveAttribute("data-implementation", "cpp-templates");
    await expect(implementationEvidence).toHaveAttribute("data-source-id", "cutlass-cpp-templates");
    await expect(implementationEvidence).toHaveAttribute("data-maturity", "current");
    await implementation.getByRole("button", { name: task4Case.cuteDsl, exact: true }).click();
    await expect(implementationEvidence).toHaveAttribute("data-implementation", "cute-dsl");
    await expect(implementationEvidence).toHaveAttribute("data-source-id", "cutlass-cute-dsl");
    await expect(implementationEvidence).toHaveAttribute("data-maturity", "preview");
    await expect(implementationEvidence).toContainText(task4Case.cutePreview);
    await expect(implementationEvidence).toContainText(/layout|yerleşim/i);
    await implementation.getByRole("button", { name: task4Case.legacyGenerator, exact: true }).click();
    await expect(implementationEvidence).toHaveAttribute("data-implementation", "legacy-generator");
    await expect(implementationEvidence).toHaveAttribute("data-source-id", "cutlass-legacy-generator");
    await expect(implementationEvidence).toHaveAttribute("data-maturity", "current");
    await expect(implementationEvidence).toContainText(/legacy|eski/i);

    await architecture.getByRole("button", { name: task4Case.blackwell, exact: true }).click();
    await expect(architectureEvidence).toHaveAttribute("data-architecture", "blackwell");
    await expect(architectureEvidence).toHaveAttribute("data-maturity", "current");
    await expect(architectureEvidence).toHaveAttribute("data-source-id", "cutlass-blackwell-sm100");
    await expect(architectureEvidence).toContainText(task4Case.blackwellEvidence);
    await expect(architectureEvidence).toContainText(/TMEM|Tensör Belleği/i);
    await expect(architectureEvidence).toContainText(/FP4/);
    await expect(architectureEvidence).toContainText(/FP8/);
    await expect(architectureEvidence).toContainText(task4Case.tensorCoreGeneration);
    await expect(architectureEvidence.locator('[data-source-id="cutlass-blackwell-sm100"]')).toContainText(/tcgen05\.mma.*FP4.*FP8|tcgen05\.mma.*FP4.*FP8/i);
    await expect(architectureEvidence.locator('[data-source-id="cutlass-grouped-scheduler"]')).toContainText(/grouped GEMM|gruplu GEMM/i);
    await expect(architectureEvidence.locator('[data-source-id="cutlass-blackwell-clc"]')).toContainText(/persistent|kalıcı/i);

    await architecture.getByRole("button", { name: task4Case.rubin, exact: true }).click();
    await expect(architectureEvidence).toHaveAttribute("data-architecture", "rubin");
    await expect(architectureEvidence).toHaveAttribute("data-maturity", "preview");
    await expect(architectureEvidence).toHaveAttribute("data-source-id", "cutlass-rubin-sm107");
    await expect(architectureEvidence).toContainText(task4Case.rubinPreview);
    await expect(architectureEvidence).toContainText(task4Case.rubinCaveat);
    await expect(architectureEvidence).toContainText(task4Case.noGraduation);
    await expectNoDocumentOverflow(page);
  });

  test(`Task 4 headings ${task4Case.locale} resolve every aria-labelledby reference`, async ({ page }) => {
    await page.setViewportSize(task4Case.viewport);
    await openModule(page, task4Case.locale, "cutlass");
    const unresolved = await page.locator(".cutlass-cute-surface [aria-labelledby]").evaluateAll((elements) => elements.flatMap((element) =>
      (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean).filter((id) => !document.getElementById(id)),
    ));
    expect(unresolved).toEqual([]);
  });
}

const task5InteractionCases = [
  {
    locale: "tr" as const,
    viewport: { width: 1440, height: 1000 },
    diagnosis: ["Zamanlayıcı", "KV cache", "Kernel", "Ağ"],
    graph: ["CUDA parçalı", "CUDA tam", "HIP parçalı", "HIP tam"],
    parallelism: ["Uzman paralelliği", "Bağlam paralelliği"],
    precision: ["FP8", "MXFP8", "MXFP4", "NVFP4"],
    contextPreview: "ÖNİZLEME",
    noMeasured: "ölçülmüş donanım kanıtı değildir",
    topology: ["PCIe", "NVLink", "NVSwitch", "GPUDirect RDMA"],
    ncclParallelism: ["DP", "TP", "PP", "EP"],
    ncclPaths: ["Topoloji kanıtı", "Simetrik kerneller", "İletişim/hesap füzyonu", "Device API özellik matrisi"],
    devicePreview: "ÖNİZLEME",
    noCore: "temel tamamlanma koşulu değildir",
    ncclNoCore: "isteğe bağlı Önizleme",
    stackLayers: ["Graf derleyici", "Kernel DSL", "Kernel kütüphanesi", "Çalışma zamanı", "Sunum sistemi"],
    stackCards: [["MLIR", "mlir-dialect-conversion", "current"], ["cuTile", "cutile-tileir", "current"], ["CUTLASS", "cutlass-kernel-library", "current"], ["ROCm 10", "rocm-10-core", "current"], ["TensorRT", "tensorrt-how-it-works", "current"]],
    stackPaths: ["ROCm 10", "CUDA Tile IR", "Triton → Tile IR", "Rubin / SM107"],
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    diagnosis: ["Scheduler", "KV cache", "Kernel", "Network"],
    graph: ["CUDA piecewise", "CUDA full", "HIP piecewise", "HIP full"],
    parallelism: ["Expert parallel", "Context parallel"],
    precision: ["FP8", "MXFP8", "MXFP4", "NVFP4"],
    contextPreview: "PREVIEW",
    noMeasured: "not measured hardware evidence",
    topology: ["PCIe", "NVLink", "NVSwitch", "GPUDirect RDMA"],
    ncclParallelism: ["DP", "TP", "PP", "EP"],
    ncclPaths: ["Topology evidence", "Symmetric kernels", "Communication/compute fusion", "Device API feature matrix"],
    devicePreview: "PREVIEW",
    noCore: "not a core completion requirement",
    ncclNoCore: "optional Preview",
    stackLayers: ["Graph compiler", "Kernel DSL", "Kernel library", "Runtime", "Serving system"],
    stackCards: [["MLIR", "mlir-dialect-conversion", "current"], ["cuTile", "cutile-tileir", "current"], ["CUTLASS", "cutlass-kernel-library", "current"], ["ROCm 10", "rocm-10-core", "current"], ["TensorRT", "tensorrt-how-it-works", "current"]],
    stackPaths: ["ROCm 10", "CUDA Tile IR", "Triton → Tile IR", "Rubin / SM107"],
  },
] as const;

for (const task5Case of task5InteractionCases) {
  test(`Task 5 inference systems decisions ${task5Case.locale} follow exact source and maturity state`, async ({ page }) => {
    await page.setViewportSize(task5Case.viewport);
    await openModule(page, task5Case.locale, "inference");
    const lab = page.locator(".inference-systems-surface .inference-decision-lab");
    const evidence = lab.locator('.inference-decision-evidence[aria-live="polite"]');

    for (const [index, label] of task5Case.diagnosis.entries()) {
      await lab.locator('[data-control="diagnosis"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-diagnosis", ["scheduler", "kv-cache", "kernel", "network"][index]);
      await expect(evidence.locator('[data-claim="diagnosis"]')).not.toHaveText("");
    }
    for (const [index, label] of task5Case.graph.entries()) {
      await lab.locator('[data-control="graph"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-graph", ["cuda-piecewise", "cuda-full", "hip-piecewise", "hip-full"][index]);
      await expect(evidence.locator('[data-claim="graph"]')).toHaveAttribute("data-source-id", index < 2 ? "vllm-cuda-graph-modes" : "vllm-stable");
      await expect(evidence.locator('[data-claim="graph"]')).toHaveAttribute("data-maturity", "current");
      if (index >= 2) {
        await expect(evidence.locator('[data-claim="graph-mechanism"]')).toHaveAttribute("data-source-id", "amd-hip-graphs");
        await expect(evidence.locator('[data-claim="graph-mechanism"]')).toContainText(index === 2 ? /stream-capture/i : /explicit-graph/i);
      }
    }
    await lab.locator('[data-control="parallelism"]').getByRole("button", { name: task5Case.parallelism[0], exact: true }).click();
    await expect(evidence).toHaveAttribute("data-parallelism", "expert");
    await expect(evidence.locator('[data-claim="parallelism"]')).toHaveAttribute("data-source-id", "vllm-expert-parallel");
    await lab.locator('[data-control="parallelism"]').getByRole("button", { name: task5Case.parallelism[1], exact: true }).click();
    await expect(evidence).toHaveAttribute("data-parallelism", "context");
    await expect(evidence.locator('[data-claim="parallelism"]')).toHaveAttribute("data-source-id", "vllm-context-parallel");
    await expect(evidence.locator('[data-claim="parallelism"]')).toHaveAttribute("data-maturity", "preview");
    await expect(evidence.locator('[data-claim="parallelism"]')).toContainText(task5Case.contextPreview);
    await expect(evidence.locator('[data-claim="parallelism"]')).toContainText(task5Case.noCore);
    for (const [index, label] of task5Case.precision.entries()) {
      await lab.locator('[data-control="precision"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-precision", ["fp8", "mxfp8", "mxfp4", "nvfp4"][index]);
      const precisionEvidence = evidence.locator('[data-claim="precision"]');
      await expect(precisionEvidence).toContainText(/hardware|donanım/i);
      await expect(precisionEvidence).toContainText(/backend/i);
      await expect(precisionEvidence).toContainText(/scale|ölçek/i);
      await expect(precisionEvidence).toContainText(/quality|kalite/i);
      await expect(precisionEvidence).toContainText(/accumulation|birikim/i);
      await expect(precisionEvidence).toHaveAttribute("data-source-ids", /vllm-|cutlass-/);
      await expect(precisionEvidence).toHaveAttribute("data-maturity", index < 2 ? "current" : "preview");
    }
    await expect(evidence.locator('[data-source-id="vllm-speculative-acceptance"]')).toHaveAttribute("data-maturity", "preview");
    await expect(evidence.locator('[data-source-id="vllm-speculative-acceptance"]')).toContainText(/acceptance rate|kabul oranı/i);
    await expect(evidence.locator('[data-claim="draft-cost"]')).toHaveAttribute("data-evidence-kind", "educational");
    await expect(evidence.locator('[data-claim="draft-cost"]')).toContainText(/draft cost|taslak maliyeti/i);
    await expect(evidence).toContainText(task5Case.noMeasured);
    await expect(evidence.locator('[data-evidence-kind="measured"]')).toHaveCount(0);
    await expectNoDocumentOverflow(page);
  });

  test(`Task 5 NCCL topology and Device API ${task5Case.locale} follow exact source and maturity state`, async ({ page }) => {
    await page.setViewportSize(task5Case.viewport);
    await openModule(page, task5Case.locale, "multigpu");
    const lab = page.locator(".nccl-multigpu-surface .nccl-architecture-lab");
    const evidence = lab.locator('.nccl-architecture-evidence[aria-live="polite"]');
    const topologySourceIds = ["nccl-pcie-p2p", "nccl-nvlink-p2p", "nccl-nvswitch-topology", "nccl-gpudirect-rdma"];
    for (const parallelism of task5Case.ncclParallelism) {
      await lab.locator('[data-control="parallelism"]').getByRole("button", { name: parallelism, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-parallelism", parallelism);
      for (const [index, label] of task5Case.topology.entries()) {
        await lab.locator('[data-control="topology"]').getByRole("button", { name: label, exact: true }).click();
        await expect(evidence).toHaveAttribute("data-topology", ["pcie", "nvlink", "nvswitch", "rdma"][index]);
        await expect(evidence.locator('[data-claim="parallelism-recommendation"]')).toHaveAttribute("data-parallel-source-id", "vllm-parallelism-scaling");
        await expect(evidence.locator('[data-claim="parallelism-recommendation"]')).toContainText(parallelism);
        await expect(evidence.locator('[data-claim="topology"]')).toHaveAttribute("data-topology-source-id", topologySourceIds[index]);
      }
    }
    for (const [index, label] of task5Case.ncclPaths.entries()) {
      await lab.locator('[data-control="system-path"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-system-path", ["topology", "symmetric", "fusion", "device-api"][index]);
    }
    await lab.locator('[data-control="system-path"]').getByRole("button", { name: task5Case.ncclPaths[1], exact: true }).click();
    await expect(evidence.locator('[data-claim="system-path"]')).toHaveAttribute("data-source-id", "nvshmem-symmetric-memory");
    await expect(evidence.locator('[data-claim="implementation"]')).toHaveAttribute("data-source-id", "nccl-device-lsa-multimem");
    await expect(evidence.locator('[data-claim="implementation"]')).toHaveAttribute("data-maturity", "current");
    await lab.locator('[data-control="system-path"]').getByRole("button", { name: task5Case.ncclPaths[2], exact: true }).click();
    await expect(evidence.locator('[data-claim="system-path"]')).toHaveAttribute("data-source-id", "nccl-cuda-streams");
    await expect(evidence.locator('[data-claim="implementation"]')).toHaveAttribute("data-source-id", "nccl-device-api-fusion");
    await lab.locator('[data-control="system-path"]').getByRole("button", { name: task5Case.ncclPaths[3], exact: true }).click();
    await expect(evidence.locator('[data-claim="system-path"]')).toHaveAttribute("data-source-id", "nccl-device-gin");
    await expect(evidence.locator('[data-claim="implementation"]')).toHaveCount(0);
    await expect(evidence.locator('[data-claim="system-path"]')).toHaveAttribute("data-maturity", "current");
    await expect(evidence.locator('[data-claim="system-path"]')).toContainText(/recompile|yeniden derle/i);
    await expect(lab.locator('[data-feature="lsa-multimem"]')).toHaveAttribute("data-maturity", "current");
    await expect(lab.locator('[data-feature="gin"]')).toHaveAttribute("data-maturity", "current");
    await expect(lab.locator('[data-feature="rust-bindings"]')).toHaveAttribute("data-maturity", "preview");
    await expect(lab.locator('[data-feature="rust-bindings"]')).toContainText(task5Case.ncclNoCore);
    await expectNoDocumentOverflow(page);
  });

  test(`Task 5 software stack layers and Preview paths ${task5Case.locale} remain distinct`, async ({ page }) => {
    await page.setViewportSize(task5Case.viewport);
    await openModule(page, task5Case.locale, "systems");
    const lab = page.locator(".gpu-software-stack-surface .stack-layer-lab");
    const evidence = lab.locator('.stack-layer-evidence[aria-live="polite"]');
    for (const [index, label] of task5Case.stackLayers.entries()) {
      await lab.locator('[data-control="stack-layer"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-layer", ["graph-compiler", "kernel-dsl", "kernel-library", "runtime", "serving-system"][index]);
      const [technology, sourceId, maturity] = task5Case.stackCards[index];
      const card = evidence.locator(`[data-technology="${technology}"]`);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute("data-source-id", sourceId);
      await expect(card).toHaveAttribute("data-maturity", maturity);
      await expect(card).not.toHaveText("");
    }
    for (const [index, label] of task5Case.stackPaths.entries()) {
      await lab.locator('[data-control="stack-path"]').getByRole("button", { name: label, exact: true }).click();
      await expect(evidence).toHaveAttribute("data-path", ["rocm10", "cuda-tile", "triton-tileir", "rubin"][index]);
    }
    await lab.locator('[data-control="stack-path"]').getByRole("button", { name: task5Case.stackPaths[2], exact: true }).click();
    await expect(evidence.locator('[data-claim="path"]')).toHaveAttribute("data-source-id", "triton-tileir-incubator");
    await expect(evidence.locator('[data-claim="path"]')).toHaveAttribute("data-maturity", "preview");
    await expect(evidence.locator('[data-claim="path"]')).toContainText(task5Case.noCore);
    await lab.locator('[data-control="stack-path"]').getByRole("button", { name: task5Case.stackPaths[3], exact: true }).click();
    await expect(evidence.locator('[data-claim="path"]')).toHaveAttribute("data-source-id", "systems-rubin-sm107");
    await expect(evidence.locator('[data-claim="path"]')).toHaveAttribute("data-maturity", "preview");
    await expect(evidence.locator('[data-claim="path"]')).toContainText(task5Case.noCore);
    await expectNoDocumentOverflow(page);
  });
}

test("geometry helper allows valid horizontal scroll content but reports nested hidden clipping", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.setContent('<div id="valid-scroll" tabindex="0" aria-label="Valid scroll" style="width:120px;overflow-x:auto"><span style="display:block;width:360px">valid offscreen scroll content</span></div>', { waitUntil: "domcontentloaded" });
  expect(await collectGeometryIssues(page)).toEqual([]);

  await page.setContent('<div id="valid-scroll" tabindex="0" aria-label="Valid scroll" style="width:120px;overflow-x:auto"><div id="clip-shell" style="width:48px;overflow:hidden"><span style="display:block;width:240px">nested clipped content</span></div><span style="display:block;width:360px">valid offscreen scroll content</span></div>', { waitUntil: "domcontentloaded" });
  expect(await collectGeometryIssues(page)).toContain("span clipped horizontally by #clip-shell (hidden)");

  await page.setContent('<div id="valid-scroll" tabindex="0" aria-label="Valid scroll" style="position:absolute;top:1200px;width:120px;overflow-x:auto"><div id="vertical-clip-shell" style="height:24px;overflow-y:clip"><span style="display:block;width:360px;height:96px">below-fold vertically clipped content</span></div></div>', { waitUntil: "domcontentloaded" });
  expect(await collectGeometryIssues(page)).toContain("span clipped vertically by #vertical-clip-shell (clip)");
});

test("state verification helper rejects a stale panel behind a changed control", async ({ page }) => {
  await page.setContent('<button aria-pressed="false" onclick="this.setAttribute(\'aria-pressed\', \'true\')">Second state</button><div id="panel">stale first panel</div>', { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "Second state" });
  await expect(activateButtonStateAndVerify(button, page.locator("#panel"))).rejects.toThrow(/state-specific panel did not change/);
});

test("state verification rejects a broad signature target containing the activating control", async ({ page }) => {
  await page.setContent('<div id="broad"><button aria-pressed="false" onclick="this.setAttribute(\'aria-pressed\', \'true\');this.className=\'active\'">Second state</button><div id="result">stale result panel</div></div>', { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "Second state" });
  await expect(activateButtonStateAndVerify(button, page.locator("#broad"))).rejects.toThrow(/signature target contains the activating control/);
});

test("every-scroller helper fails when a later actual scroller lacks visible keyboard focus", async ({ page }) => {
  await page.setContent('<style>#good:focus-visible{outline:3px solid #fff}#bad:focus-visible{outline:none}</style><main><div id="good" tabindex="0" aria-label="Good scroller" style="width:100px;overflow-x:auto"><span style="display:block;width:300px">good scroll content</span></div><div id="bad" tabindex="0" aria-label="Bad scroller" style="width:100px;overflow-x:auto"><span style="display:block;width:300px">bad scroll content</span></div></main>', { waitUntil: "domcontentloaded" });
  await expect(expectEveryActualScrollerKeyboardFocus(page, page.locator("main"))).rejects.toThrow();
});

test("focus oracle rejects a same-color cosmetic ring", async ({ page }) => {
  await page.setContent('<style>body{background:#111}#cosmetic{background:#111}#cosmetic:focus-visible{outline:3px solid #111}</style><input id="cosmetic" aria-label="Cosmetic focus">', { waitUntil: "domcontentloaded" });
  await expect(expectVisibleKeyboardFocusRing(page, page.locator("#cosmetic"))).rejects.toThrow();
});

test("focus oracle accepts an opaque rgb ring whose blue channel is zero", async ({ page }) => {
  await page.setContent('<style>body{background:#0d1117}#valid{background:#0d1117}#valid:focus-visible{outline:3px solid #d12f00}</style><div id="valid" tabindex="0" aria-label="Valid focus">scroll region</div>', { waitUntil: "domcontentloaded" });
  await expectVisibleKeyboardFocusRing(page, page.locator("#valid"));
});

for (const viewport of [
  { name: "compact-1024", width: 1024, height: 768 },
  { name: "narrow-320", width: 320, height: 800 },
] as const) {
  test(`every rendered actual scroller exposes keyboard focus at ${viewport.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    let actualChecks = 0;
    let renderedStates = 0;
    for (const moduleId of moduleIds) {
      await openModule(page, "en", moduleId);
      const root = page.locator(moduleRoots[moduleId]);
      const check = async () => {
        actualChecks += await expectEveryActualScrollerKeyboardFocus(
          page,
          root,
          viewport.width === 320 && moduleId !== "architecture" && moduleId !== "visual",
          `${moduleId} representative state ${renderedStates + 1}`,
        );
        renderedStates += 1;
      };
      const hiddenPanelControls = moduleId === "toolchain"
        ? root.locator(":scope > .topbar [role=group] > button")
        : moduleId === "architecture"
          ? root.locator(":scope > .tabs > button")
          : moduleId === "memory"
            ? root.locator(".module-nav > button")
            : null;
      if (hiddenPanelControls) {
        for (const control of await hiddenPanelControls.all()) {
          await control.click();
          await check();
        }
      } else {
        await check();
      }
      await activateRepresentativeScrollerStates(page, moduleId, check);
    }
    expect(actualChecks).toBeGreaterThan(0);
    console.log(`[scroller-focus] ${viewport.name}: ${actualChecks} actual scroller focus checks across ${renderedStates} representative module states`);
  });
}

for (const viewport of geometryViewports) {
  for (const locale of locales) {
    for (const moduleId of moduleIds) {
      test(`geometry ${viewport.name} ${locale} ${moduleId}`, async ({ page }) => {
        const runtimeErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") runtimeErrors.push(message.text());
        });
        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        await page.setViewportSize(viewport);
        await openModule(page, locale, moduleId);
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.getByTestId("atlas-complete")).toBeVisible();
        await expect(page.getByTestId("atlas-next")).toBeVisible();
        expect(await collectGeometryIssues(page)).toEqual([]);
        expect(runtimeErrors).toEqual([]);
      });
    }
  }
}

for (const locale of locales) {
  test(`GPU Software Stack fits a real 15px scrollbar gutter at narrow-320 ${locale}`, async () => {
    test.setTimeout(60_000);
    const browser = await chromium.launch({ headless: false });
    try {
      const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
      const page = await context.newPage();
      await gotoAtlas(page, locale);
      await page.addStyleTag({
        content: "html { overflow-y: scroll !important; scrollbar-gutter: stable !important; }",
      });
      const gutter = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        gutter: window.innerWidth - document.documentElement.clientWidth,
      }));
      expect(gutter).toEqual({ innerWidth: 320, clientWidth: 305, gutter: 15 });

      await page.getByTestId("atlas-menu-button").click();
      await page.getByTestId("atlas-drawer").locator(".atlas-module-nav button").nth(moduleIds.indexOf("systems")).click();
      await expect(page.locator(moduleRoots.systems)).toBeVisible();
      expect(await collectGeometryIssues(page)).toEqual([]);
      await expectNoDocumentOverflow(page);
      await context.close();
    } finally {
      await browser.close();
    }
  });
}

test("Multi-GPU and GPU Software Stack fit a real 15px scrollbar gutter at intermediate-1280 in both locales", async () => {
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    for (const locale of locales) {
      await gotoAtlas(page, locale);
      await page.addStyleTag({
        content: "html { overflow-y: scroll !important; scrollbar-gutter: stable !important; }",
      });
      const gutter = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        gutter: window.innerWidth - document.documentElement.clientWidth,
      }));
      expect(gutter).toEqual({ innerWidth: 1280, clientWidth: 1265, gutter: 15 });
      for (const moduleId of ["multigpu", "systems"] as const) {
        await page.locator(".atlas-sidebar").getByTestId(`atlas-module-${moduleId}`).click();
        await expect(page.locator(moduleRoots[moduleId])).toBeVisible();
        expect(await collectGeometryIssues(page)).toEqual([]);
        await expectNoDocumentOverflow(page);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }
});

for (const task6Case of [
  {
    locale: "tr" as const,
    viewport: { width: 1440, height: 1000 },
    roadmapLink: "12 haftayı gör",
    labels: ["Temel", "Güncel", "Önizleme"],
    preview: "Önizleme: araç zinciri ya da donanım olgunlaşmasına bağlı keşif yoludur; mezuniyet koşulu değildir.",
    weekOne: "Yetenek ve ortam kanıtı",
    weekEleven: "Ayrıştırılmış çıkarım ve NCCL",
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    roadmapLink: "View the 12 weeks",
    labels: ["Core", "Current", "Preview"],
    preview: "Preview: an exploration path dependent on toolchain or hardware maturity; it is not a graduation requirement.",
    weekOne: "Capability & environment evidence",
    weekEleven: "Disaggregated inference & NCCL",
  },
] as const) {
  test(`Task 6 ${task6Case.locale} overview keeps the roadmap, maturity policy, and responsive shell connected`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.setViewportSize(task6Case.viewport);
    await gotoAtlas(page, task6Case.locale);

    await expect(page.locator(".module-grid .module-card")).toHaveCount(12);
    const policy = page.getByTestId("atlas-maturity-policy");
    await expect(policy).toBeVisible();
    for (const label of task6Case.labels) await expect(policy.locator(".freshness-badge").filter({ hasText: label })).toHaveText(label);
    await expect(policy).toContainText(task6Case.preview);
    await page.getByRole("link", { name: task6Case.roadmapLink, exact: true }).click();
    const roadmap = page.locator("#roadmap");
    await expect(roadmap).toBeInViewport();
    await expect(roadmap.locator(".week-list article")).toHaveCount(12);
    await expect(roadmap).toContainText(task6Case.weekOne);
    await expect(roadmap).toContainText(task6Case.weekEleven);
    await expect(roadmap).toContainText(/Bitirme projesi ve portföy|Capstone & portfolio/);
    await expectNoDocumentOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });
}

for (const task7Case of [
  {
    locale: "tr" as const,
    viewport: { width: 390, height: 844 },
    evidenceLabel: "MİMARİ KAYNAK KANITI",
    maturity: "Güncel",
    applicability: "Uygulanabilirlik",
  },
  {
    locale: "en" as const,
    viewport: { width: 390, height: 844 },
    evidenceLabel: "ARCHITECTURE SOURCE EVIDENCE",
    maturity: "Current",
    applicability: "Applicability",
  },
] as const) {
  test(`Task 7 ${task7Case.locale} architecture renders direct source evidence with responsive keyboard access`, async ({ page }) => {
    await page.setViewportSize(task7Case.viewport);
    await openModule(page, task7Case.locale, "architecture");

    const evidence = page.locator(".cuda-simt-surface .architecture-source-evidence");
    await expect(evidence).toHaveCount(1);
    await expect(evidence.locator(".architecture-source-heading")).toContainText(task7Case.evidenceLabel);

    for (const source of [
      {
        id: "cuda-guide",
        title: "CUDA Programming Guide",
        href: "https://docs.nvidia.com/cuda/cuda-programming-guide/",
      },
      {
        id: "cuda-tile",
        title: "CUDA 13.1 and CUDA Tile",
        href: "https://developer.nvidia.com/blog/nvidia-cuda-13-1-powers-next-gen-gpu-programming-with-nvidia-cuda-tile-and-performance-gains/",
      },
      {
        id: "cuda-tile-nvcc-13-3",
        title: "NVIDIA CUDA Compiler Driver 13.3 — Tile Compilation",
        href: "https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/",
      },
      {
        id: "cutile-python-1-5-release",
        title: "cuTile Python 1.5.0 Release Notes",
        href: "https://docs.nvidia.com/cuda/cutile-python/generated/release_notes.html",
      },
    ]) {
      const card = evidence.locator(`[data-source-id="${source.id}"]`);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute("data-maturity", "current");
      await expect(card).toContainText(task7Case.maturity);
      await expect(card).toContainText(task7Case.applicability);
      const link = card.getByRole("link", { name: source.title, exact: true });
      await expect(link).toHaveAttribute("href", source.href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expectVisibleKeyboardFocus(page, link);
    }

    await expectNoDocumentOverflow(page);
  });
}

for (const viewport of [
  { name: "compact-1024", width: 1024, height: 768 },
  { name: "narrow-320", width: 320, height: 800 },
] as const) {
  for (const locale of locales) {
    for (const moduleId of moduleIds) {
      test(`state geometry ${viewport.name} ${locale} ${moduleId}`, async ({ page }) => {
        const runtimeErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") runtimeErrors.push(message.text());
        });
        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        await page.setViewportSize(viewport);
        await openModule(page, locale, moduleId);
        await expectStateGeometry(page, moduleId, runtimeErrors);
        await exerciseLayoutStates(page, moduleId, runtimeErrors);
      });
    }
  }
}

test("keyboard button, select, and range controls preserve focus and state", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openModule(page, "en", "architecture");
  const tabs = page.locator(".cuda-simt-surface .tabs button");
  const simtTab = tabs.nth(2);
  await expectVisibleKeyboardFocus(page, simtTab);
  await page.keyboard.press("Enter");
  await expect(simtTab).toHaveAttribute("aria-pressed", "true");

  const predicate = page.locator(".cuda-simt-surface .controls select");
  await expectVisibleKeyboardFocus(page, predicate);
  const threshold = page.locator('.cuda-simt-surface .controls input[type="range"]');
  const initialThreshold = Number(await threshold.inputValue());
  await expectVisibleKeyboardFocus(page, threshold);
  await page.keyboard.press("ArrowRight");
  expect(Number(await threshold.inputValue())).toBe(initialThreshold + 1);
  await page.keyboard.press("Shift+Tab");
  await expect(predicate).toBeFocused();
  await predicate.press("a");
  await expect(predicate).toHaveValue("uniform");
  await expect(page.locator(".cuda-simt-surface .detail-card").last()).not.toHaveAttribute("aria-live", "polite");
});

test("keyboard switch and select controls update the software-stack live plan", async ({ page }) => {
  await openModule(page, "en", "systems");
  const output = page.locator(".gpu-software-stack-surface .lab-output");
  const initialOutput = await output.innerText();
  const precision = page.locator(".gpu-software-stack-surface .lab-controls select").first();
  await expectVisibleKeyboardFocus(page, precision);
  await precision.press("i");
  await expect(precision).toHaveValue("INT8");
  await expect(output).not.toHaveText(initialOutput);

  const fusion = page.getByRole("switch", { name: "Fusion" });
  const initialChecked = await fusion.getAttribute("aria-checked");
  const beforeFusion = await output.innerText();
  await expectVisibleKeyboardFocus(page, fusion);
  await page.keyboard.press("Space");
  expect(await fusion.getAttribute("aria-checked")).not.toBe(initialChecked);
  await expect(output).not.toHaveText(beforeFusion);
  await expect(output).toHaveAttribute("aria-live", "polite");
});

test("keyboard checkbox and radio controls update native state", async ({ page }) => {
  await openModule(page, "en", "triton");
  const checkbox = page.locator('.pytorch-triton-surface input[type="checkbox"]').last();
  await expectVisibleKeyboardFocus(page, checkbox, checkbox.locator("xpath=.."), checkbox.locator("xpath=.."));
  await expect(checkbox).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();

  await openModule(page, "en", "correctness");
  const radio = page.locator('.kernel-safety-surface input[type="radio"]').first();
  await expectVisibleKeyboardFocus(page, radio, radio.locator("xpath=.."), radio.locator("xpath=.."));
  await page.keyboard.press("Space");
  await expect(radio).toBeChecked();
});

test("keyboard text editing, run output, and disclosure feedback remain usable", async ({ page }) => {
  await openModule(page, "en", "toolchain");
  const primary = page.locator(".kernel-forge-surface .hero-actions .primary");
  await expectVisibleKeyboardFocus(page, primary);
  await page.keyboard.press("Enter");
  const editor = page.getByRole("textbox", { name: "Code editor" });
  await expectVisibleKeyboardFocus(page, editor);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("echo keyboard-ready");
  await expect(editor).toHaveValue("echo keyboard-ready");
  const output = page.locator(".kernel-forge-surface .output-pane");
  const beforeRun = await output.innerText();
  await expect(output).toHaveAttribute("aria-live", "polite");
  const run = page.locator(".kernel-forge-surface .editor-actions .run");
  await expectVisibleKeyboardFocus(page, run);
  await page.keyboard.press("Enter");
  await expect(output).not.toHaveText(beforeRun);

  await openModule(page, "en", "multigpu");
  const disclosure = page.locator(".nccl-multigpu-surface .decision-card > button");
  const answer = page.locator(".nccl-multigpu-surface .answer");
  await expect(answer).toHaveCount(1);
  await expect(answer).toHaveText("");
  await expectVisibleKeyboardFocus(page, disclosure);
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(answer).not.toHaveText("");
  await expect(answer).toHaveAttribute("aria-live", "polite");
});

for (const locale of locales) {
  test(`${locale} PyTorch + Triton content CTA honors reduced-motion scrolling`, async ({ page }) => {
    await openModule(page, locale, "triton");
    const contentCta = page.locator(".pytorch-triton-surface .week-gate button");
    await expect(contentCta).toHaveCount(1);

    for (const [reducedMotion, expectedBehavior] of [["reduce", "auto"], ["no-preference", "smooth"]] as const) {
      await page.emulateMedia({ reducedMotion });
      await expect.poll(() => page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(reducedMotion === "reduce");
      await page.evaluate(() => {
        const target = document.querySelector("#lab");
        if (!target) throw new Error("PyTorch + Triton lab target is missing");
        const state = window as Window & { __pytorchTritonScrollBehaviors?: Array<ScrollBehavior | undefined> };
        state.__pytorchTritonScrollBehaviors = [];
        target.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
          state.__pytorchTritonScrollBehaviors?.push(typeof options === "object" ? options?.behavior : undefined);
        };
      });

      await contentCta.click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __pytorchTritonScrollBehaviors?: Array<ScrollBehavior | undefined> }).__pytorchTritonScrollBehaviors)).toEqual([expectedBehavior]);
    }
  });
}

test("keyboard quiz choice exposes polite discrete feedback", async ({ page }) => {
  await openModule(page, "en", "cutlass");
  const choice = page.locator(".cutlass-cute-surface .answers button").first();
  const cutlassFeedback = page.locator(".cutlass-cute-surface .quiz-feedback");
  await expect(cutlassFeedback).toHaveCount(1);
  await expect(cutlassFeedback).toHaveText("");
  await expectVisibleKeyboardFocus(page, choice);
  await page.keyboard.press("Enter");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(cutlassFeedback).not.toHaveText("");
  await expect(cutlassFeedback).toHaveAttribute("aria-live", "polite");

  await openModule(page, "en", "operators");
  const llmChoice = page.locator(".llm-kernel-patterns-surface .quiz-options button").first();
  const llmFeedback = page.locator(".llm-kernel-patterns-surface .quiz-note");
  await expect(llmFeedback).toHaveCount(1);
  await expect(llmFeedback).toHaveText("");
  await expectVisibleKeyboardFocus(page, llmChoice);
  await page.keyboard.press("Enter");
  await expect(llmFeedback).not.toHaveText("");
  await expect(llmFeedback).toHaveAttribute("aria-live", "polite");

  await openModule(page, "en", "profiling");
  const nsightChoice = page.locator(".nsight-benchmark-surface .question button").first();
  const nsightFeedback = page.locator(".nsight-benchmark-surface .question-feedback").first();
  await expect(nsightFeedback).toHaveCount(1);
  await expect(nsightFeedback).toHaveText("");
  await expectVisibleKeyboardFocus(page, nsightChoice);
  await page.keyboard.press("Enter");
  await expect(nsightFeedback).not.toHaveText("");
  await expect(nsightFeedback).toHaveAttribute("aria-live", "polite");
});

for (const locale of locales) {
  test(`${locale} laboratory state repairs malformed values and stays interactive`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kernel-forge-progress", "{bad-json");
      window.localStorage.setItem("kernel-lab-completed", "Infinity");
      window.localStorage.setItem("kernel-lab-note", "restored note");
    });
    await openModule(page, locale, "toolchain");
    await expect(page.locator(".kernel-forge-surface .progress-head strong")).toHaveText("0%");
    await page.locator(".kernel-forge-surface .lesson-card button").first().click();
    await expect(page.locator(".kernel-forge-surface .progress-head strong")).toHaveText("7%");
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("kernel-forge-progress"))).toBe('["cpp-0"]');

    await openModule(page, locale, "triton");
    await expect(page.locator(".pytorch-triton-surface .progress-label strong")).toHaveText(/%?6%?/);
    await expect(page.locator("#learning-note")).toHaveValue("restored note");
    await page.locator(".pytorch-triton-surface .run-button").click();
    await expect(page.locator(".pytorch-triton-surface .progress-label strong")).toHaveText(/%?11%?/);
  });

  test(`${locale} laboratories continue in memory when storage access is denied`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("storage denied"); } });
    });
    await openModule(page, locale, "toolchain");
    await page.locator(".kernel-forge-surface .lesson-card button").first().click();
    await expect(page.locator(".kernel-forge-surface .progress-head strong")).toHaveText("7%");

    await openModule(page, locale, "triton");
    await page.locator("#learning-note").fill("memory-only note");
    await page.locator(".pytorch-triton-surface .note-area button").click();
    await expect(page.locator("#learning-note")).toHaveValue("memory-only note");
    await expect(page.locator(".pytorch-triton-surface .note-storage-status")).toContainText(
      locale === "tr" ? "bellekte kalır" : "remains in memory",
    );
    await expect(page.locator(".pytorch-triton-surface .note-area button")).not.toContainText(/KAYDEDİLDİ|SAVED/);
  });

  test(`${locale} module roots and descendants eliminate animation under reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const moduleId of ["architecture", "inference", "multigpu"] as const) {
      await openModule(page, locale, moduleId);
      const state = await page.locator(moduleRoots[moduleId]).evaluate((root) => {
        const elements = [root, ...root.querySelectorAll("*")];
        const durations = elements.flatMap((element) => {
          const style = getComputedStyle(element);
          return `${style.animationDuration},${style.transitionDuration}`.match(/[\d.]+m?s/g) ?? [];
        }).map((value) => value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000);
        return { rootScroll: getComputedStyle(document.documentElement).scrollBehavior, maxDuration: Math.max(0, ...durations) };
      });
      expect(state.rootScroll).toBe("auto");
      expect(state.maxDuration).toBe(0);
    }
  });

  test(`${locale} glossary search exposes a high-contrast visible keyboard focus ring`, async ({ page }) => {
    await openModule(page, locale, "systems");
    await expectVisibleKeyboardFocusRing(page, page.locator(".gpu-software-stack-surface .search-box input"));
  });
}

test("discrete feedback regions are mounted empty and update after interaction", async ({ page }) => {
  const expectEmptyLiveRegion = async (region: ReturnType<Page["locator"]>) => {
    await expect(region).toHaveCount(1);
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(region).toHaveText("");
  };

  await openModule(page, "en", "toolchain");
  await page.locator(".kernel-forge-surface > .topbar [role=group] > button").nth(2).click();
  const forgeAnswer = page.locator(".kernel-forge-surface .question-list .answer").first();
  await expectEmptyLiveRegion(forgeAnswer);
  await page.locator(".kernel-forge-surface .question-list article > button").first().click();
  await expect(forgeAnswer).not.toHaveText("");

  await openModule(page, "en", "triton");
  const tritonFeedback = page.locator(".pytorch-triton-surface .quiz-card .feedback");
  await expectEmptyLiveRegion(tritonFeedback);
  await page.locator(".pytorch-triton-surface .quiz-options button").first().click();
  await expect(tritonFeedback).not.toHaveText("");

  await openModule(page, "en", "operators");
  const llmFeedback = page.locator(".llm-kernel-patterns-surface .quiz-note");
  await expectEmptyLiveRegion(llmFeedback);
  await page.locator(".llm-kernel-patterns-surface .quiz-options button").first().click();
  await expect(llmFeedback).not.toHaveText("");

  await openModule(page, "en", "correctness");
  const safetyFeedback = page.locator(".kernel-safety-surface .quiz-intro .score");
  await expectEmptyLiveRegion(safetyFeedback);
  for (const fieldset of await page.locator(".kernel-safety-surface .questions fieldset").all()) {
    await fieldset.locator('input[type="radio"]').first().check();
  }
  await page.locator(".kernel-safety-surface .quiz-button").click();
  await expect(safetyFeedback).not.toHaveText("");

  await openModule(page, "en", "profiling");
  const nsightFeedback = page.locator(".nsight-benchmark-surface .question").first().locator(".question-feedback");
  await expectEmptyLiveRegion(nsightFeedback);
  await page.locator(".nsight-benchmark-surface .question").first().locator("button").first().click();
  await expect(nsightFeedback).not.toHaveText("");

  await openModule(page, "en", "cutlass");
  const cutlassFeedback = page.locator(".cutlass-cute-surface .quiz-feedback");
  await expectEmptyLiveRegion(cutlassFeedback);
  await page.locator(".cutlass-cute-surface .answers button").first().click();
  await expect(cutlassFeedback).not.toHaveText("");

  await openModule(page, "en", "inference");
  const inferenceFeedback = page.locator(".inference-systems-surface .quiz-list fieldset").first().locator(".quiz-feedback").first();
  await expectEmptyLiveRegion(inferenceFeedback);
  await page.locator(".inference-systems-surface .quiz-list fieldset").first().locator("button").first().click();
  await expect(inferenceFeedback).not.toHaveText("");

  await openModule(page, "en", "multigpu");
  const ncclFeedback = page.locator(".nccl-multigpu-surface .decision-card .answer");
  await expectEmptyLiveRegion(ncclFeedback);
  await page.locator(".nccl-multigpu-surface .decision-card > button").click();
  await expect(ncclFeedback).not.toHaveText("");
});

for (const locale of locales) {
  test(`${locale} overview owns one main and one H1`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await gotoAtlas(page, locale);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(runtimeErrors).toEqual([]);
  });

  test(`${locale} overview shows architecture coverage and freshness labels`, async ({ page }) => {
    await gotoAtlas(page, locale);
    const matrix = page.getByTestId("atlas-architecture-matrix");
    const labels = locale === "tr"
      ? { core: "Temel", current: "Güncel", preview: "Önizleme", caveat: "Önizleme içeriği, desteklenen araç zincirlerine bağlıdır." }
      : { core: "Core", current: "Current", preview: "Preview", caveat: "Preview content depends on supported toolchains." };
    const associations = [
      { id: "ada", name: "Ada", support: "SM89 / core baseline", maturity: "core", label: labels.core },
      { id: "hopper", name: "Hopper", support: "SM90 / current", maturity: "current", label: labels.current },
      { id: "blackwell", name: "Blackwell", support: "SM100 · SM120 / current", maturity: "current", label: labels.current },
      { id: "rubin", name: "Rubin", support: "SM107 / preview", maturity: "preview", label: labels.preview },
    ] as const;
    for (const association of associations) {
      const card = page.getByTestId(`atlas-architecture-${association.id}`);
      await expect(card).toHaveAttribute("data-maturity", association.maturity);
      await expect(card).toContainText(association.name);
      await expect(card).toContainText(association.support);
      await expect(card.locator(".freshness-badge")).toHaveText(association.label);
    }
    const rubin = page.getByTestId("atlas-architecture-rubin");
    await expect(rubin).toContainText(labels.caveat);
    await expect(rubin.locator(".freshness-badge.current")).toHaveCount(0);
    await expect(rubin).not.toContainText("generally available");
    await expect(rubin).not.toContainText("GA");
    await expect(matrix).toBeVisible();
  });

  test(`${locale} search exposes an empty state and clear action`, async ({ page }) => {
    await gotoAtlas(page, locale);
    const search = page.getByTestId("atlas-search");
    await search.fill("no-module-can-match-this-query");
    await expect(page.getByTestId("atlas-search-empty")).toBeVisible();
    await page.getByTestId("atlas-search-clear").click();
    await expect(search).toHaveValue("");
    await expect(page.getByTestId("atlas-module-toolchain")).toBeVisible();
  });

  test(`${locale} search matches localized content and visible architecture metadata`, async ({ page }) => {
    await gotoAtlas(page, locale);
    const search = page.getByTestId("atlas-search");
    const localizedCases = locale === "tr"
      ? [
          { query: "Mühendislik Temelleri", ids: ["toolchain"] },
          { query: "banka çakışması", ids: ["memory"] },
          { query: "opcheck", ids: ["triton"] },
          { query: "Temel", ids: ["visual", "toolchain", "correctness"] },
        ]
      : [
          { query: "Engineering Foundations", ids: ["toolchain"] },
          { query: "bank conflicts", ids: ["memory"] },
          { query: "opcheck", ids: ["triton"] },
          { query: "Core", ids: ["visual", "toolchain", "architecture", "memory", "triton", "operators", "correctness", "profiling", "cutlass", "inference", "systems"] },
        ];
    const architectureCases = [
      { query: "Rubin", ids: ["architecture", "cutlass", "systems"] },
      { query: "core baseline", ids: ["visual", "toolchain", "architecture", "memory", "triton", "operators", "correctness", "profiling", "cutlass", "inference", "systems"] },
      { query: "SM90", ids: [...moduleIds] },
      { query: "SM100", ids: [...moduleIds] },
      { query: "SM107", ids: ["architecture", "cutlass", "systems"] },
    ];

    for (const searchCase of [...localizedCases, ...architectureCases]) {
      await search.fill(searchCase.query);
      const matches = page.locator('.atlas-sidebar [data-testid^="atlas-module-"]');
      await expect(matches, `query ${searchCase.query}`).toHaveCount(searchCase.ids.length);
      for (const id of searchCase.ids) {
        await expect(page.getByTestId(`atlas-module-${id}`), `query ${searchCase.query} includes ${id}`).toBeVisible();
      }
    }
  });

  test(`${locale} mobile drawer closes on Escape and returns focus`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAtlas(page, locale);
    const trigger = page.getByTestId("atlas-menu-button");
    await trigger.click();
    const drawer = page.getByTestId("atlas-drawer");
    await expect(drawer).toBeVisible();
    const closeButton = drawer.getByRole("button", { name: locale === "tr" ? "Atlas menüsünü kapat" : "Close atlas menu" });
    const focusableControls = drawer.locator('button, input, a[href], select, textarea, [tabindex]:not([tabindex="-1"])');
    const lastControl = focusableControls.last();
    await expect(page.locator(".atlas-drawer-backdrop")).toHaveAttribute("tabindex", "-1");
    await expect(closeButton).toBeFocused();
    await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe("hidden");
    await page.keyboard.press("Shift+Tab");
    await expect(lastControl).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe("");
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${locale} overview has no document overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await gotoAtlas(page, locale);
      await expectNoDocumentOverflow(page);
    });
  }
}

test("mobile drawer closes without focus return when resized across the desktop breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAtlas(page, "en");
  const trigger = page.getByTestId("atlas-menu-button");
  await trigger.click();
  await expect(page.getByTestId("atlas-drawer")).toBeVisible();
  await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe("hidden");

  await page.setViewportSize({ width: 821, height: 844 });
  await expect(page.getByTestId("atlas-drawer")).toHaveCount(0);
  await expect(page.locator(".atlas-drawer-backdrop")).toHaveCount(0);
  await expect(page.evaluate(() => document.body.style.overflow)).resolves.toBe("");
  await expect(page.locator(".atlas-sidebar")).toBeVisible();
  await expect(trigger).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).not.toBe("atlas-menu-button");
});

test("malformed local state recovers without blocking the overview", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kernel-atlas-completed", "{not-json");
    window.localStorage.setItem("kernel-atlas-last-visited", "obsolete");
  });
  await gotoAtlas(page, "tr");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByTestId("atlas-start")).toBeVisible();
  await expect(page.getByTestId("atlas-continue")).toHaveCount(0);
  await expect(page.getByText("0/12 ATLAS", { exact: true })).toBeVisible();
  await expect(page.evaluate(() => window.localStorage.getItem("kernel-atlas-completed"))).resolves.toBeNull();
});

test("valid last visit exposes a resume action", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kernel-atlas-last-visited", "memory");
  });
  await gotoAtlas(page, "en");
  await page.getByTestId("atlas-continue").click();
  await expect(page.getByTestId("atlas-module-title")).toContainText("GPU Memory Lab");
});

test("locale buttons fully navigate and replace document head metadata in both directions", async ({ page }) => {
  await page.addInitScript(() => {
    const next = Number(window.sessionStorage.getItem("atlas-document-loads") ?? "0") + 1;
    window.sessionStorage.setItem("atlas-document-loads", String(next));
  });
  await gotoAtlas(page, "tr");
  await expectLocalizedDocumentHead(page, "tr");
  await expect(page.evaluate(() => window.sessionStorage.getItem("atlas-document-loads"))).resolves.toBe("1");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/(?:$|#)/);
  await expectLocalizedDocumentHead(page, "en");
  await expect(page.evaluate(() => window.sessionStorage.getItem("atlas-document-loads"))).resolves.toBe("2");
  await expect(page.evaluate(() => window.localStorage.getItem("kernel-atlas-language"))).resolves.toBe("en");

  await page.getByRole("button", { name: "TR", exact: true }).click();
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5173\/(?:$|#)/);
  await expectLocalizedDocumentHead(page, "tr");
  await expect(page.evaluate(() => window.sessionStorage.getItem("atlas-document-loads"))).resolves.toBe("3");
  await expect(page.evaluate(() => window.localStorage.getItem("kernel-atlas-language"))).resolves.toBe("tr");
});

test("bare root safely applies stored locale before browser fallback while explicit /en/ wins", async ({ browser }) => {
  const cases = [
    { name: "stored EN", path: "/", browserLocale: "tr-TR", storageKey: "kernel-atlas-language", stored: "en", expected: "en", loads: "2" },
    { name: "stored TR", path: "/", browserLocale: "en-US", storageKey: "kernel-atlas-language", stored: "tr", expected: "tr", loads: "1" },
    { name: "English browser fallback", path: "/", browserLocale: "en-US", storageKey: null, stored: null, expected: "en", loads: "2" },
    { name: "explicit English path", path: "/en/", browserLocale: "tr-TR", storageKey: "kernel-atlas-language", stored: "tr", expected: "en", loads: "1" },
  ] as const;

  for (const preferenceCase of cases) {
    const context = await browser.newContext({ locale: preferenceCase.browserLocale });
    const preferencePage = await context.newPage();
    await preferencePage.addInitScript(({ storageKey, stored }) => {
      if (storageKey && stored) window.localStorage.setItem(storageKey, stored);
      window.sessionStorage.setItem("preference-loads", String(Number(window.sessionStorage.getItem("preference-loads") ?? "0") + 1));
      window.addEventListener("DOMContentLoaded", () => {
        const observer = new MutationObserver(() => {
          if (window.location.pathname === "/" && document.documentElement.dataset.atlasReady === "true") {
            window.sessionStorage.setItem("bare-root-ready-seen", "true");
          }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-atlas-ready"] });
      });
    }, { storageKey: preferenceCase.storageKey, stored: preferenceCase.stored });

    await preferencePage.goto(preferenceCase.path, { waitUntil: "domcontentloaded" });
    await expect(preferencePage.locator("html"), preferenceCase.name).toHaveAttribute("data-atlas-ready", "true");
    await expectLocalizedDocumentHead(preferencePage, preferenceCase.expected);
    await expect(preferencePage, preferenceCase.name).toHaveURL(preferenceCase.expected === "en" ? /\/en\/$/ : /:\d+\/$/);
    await expect(preferencePage.evaluate(() => window.sessionStorage.getItem("preference-loads")), preferenceCase.name).resolves.toBe(preferenceCase.loads);
    if (preferenceCase.loads === "2") {
      await expect(preferencePage.evaluate(() => window.sessionStorage.getItem("bare-root-ready-seen")), `${preferenceCase.name} must redirect before marking the Turkish document ready`).resolves.toBeNull();
    }
    await context.close();
  }

  const deniedContext = await browser.newContext({ locale: "en-US" });
  const deniedPage = await deniedContext.newPage();
  await deniedPage.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("Storage denied", "SecurityError"); } });
    Object.defineProperty(window.navigator, "language", { configurable: true, get() { throw new DOMException("Navigator denied", "SecurityError"); } });
  });
  await deniedPage.goto("/", { waitUntil: "domcontentloaded" });
  await expect(deniedPage.locator("html")).toHaveAttribute("data-atlas-ready", "true");
  await expectLocalizedDocumentHead(deniedPage, "tr");
  await expect(deniedPage).toHaveURL(/:\d+\/$/);
  await deniedContext.close();
});

test("denied storage does not block startup or locale and session UI updates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Storage access denied", "SecurityError"); },
    });
  });

  await gotoAtlas(page, "tr");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByText("0/12 ATLAS", { exact: true })).toHaveCount(1);
  await expect(page.getByTestId("atlas-continue")).toHaveCount(0);

  await page.getByTestId("atlas-menu-button").click();
  const drawer = page.getByTestId("atlas-drawer");
  const drawerSearch = drawer.getByPlaceholder("Atlas içinde ara");
  await expect(drawer).toBeVisible();
  await drawerSearch.fill("CUDA");
  await drawer.getByRole("button", { name: "Atlas menüsünü kapat" }).click();
  await expect(drawer).toBeHidden();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/(?:$|#)/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-atlas-ready", "true");
  await page.getByTestId("atlas-menu-button").click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByPlaceholder("Search the atlas")).toHaveValue("");
});

for (const { locale, completedTitle, incompleteTitle, status } of [
  { locale: "tr", completedTitle: "Mühendislik Temelleri", incompleteTitle: "Mimari → SIMT → CUDA", status: "Tamamlandı" },
  { locale: "en", completedTitle: "Engineering Foundations", incompleteTitle: "Architecture → SIMT → CUDA", status: "Completed" },
] as const) {
  test(`${locale} completed module exposes localized status in desktop and drawer navigation`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("kernel-atlas-completed", JSON.stringify(["toolchain"]));
    });
    await gotoAtlas(page, locale);

    const desktopNav = page.locator(".atlas-sidebar");
    await expect(desktopNav.getByRole("button", { name: new RegExp(completedTitle) })).toHaveAccessibleName(new RegExp(status));
    await expect(desktopNav.getByRole("button", { name: new RegExp(incompleteTitle) })).not.toHaveAccessibleName(new RegExp(status));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("atlas-menu-button").click();
    const drawer = page.getByTestId("atlas-drawer");
    await expect(drawer.getByRole("button", { name: new RegExp(completedTitle) })).toHaveAccessibleName(new RegExp(status));
    await expect(drawer.getByRole("button", { name: new RegExp(incompleteTitle) })).not.toHaveAccessibleName(new RegExp(status));
  });
}

for (const { locale, firstTitle, nextTitle } of [
  { locale: "tr", firstTitle: "Mühendislik Temelleri", nextTitle: "Mimari" },
  { locale: "en", firstTitle: "Engineering Foundations", nextTitle: "Architecture" },
] as const) {
  test(`${locale} module completion persists and next opens the following module`, async ({ page }) => {
    await page.addInitScript(() => {
      const nativeScrollTo = window.scrollTo;
      const target = window as Window & { __atlasScrollCalls?: Array<{ behavior: ScrollBehavior | undefined; computed: string }> };
      target.__atlasScrollCalls = [];
      window.scrollTo = function (...args: [ScrollToOptions] | [number, number]) {
        const first = args[0];
        if (typeof first === "object") {
          target.__atlasScrollCalls?.push({
            behavior: first.behavior,
            computed: getComputedStyle(document.documentElement).scrollBehavior,
          });
        }
        Reflect.apply(nativeScrollTo, window, args);
      } as typeof window.scrollTo;
    });
    await gotoAtlas(page, locale);
    await page.getByTestId("atlas-module-toolchain").click();
    await expect(page.getByTestId("atlas-module-title")).toContainText(firstTitle);
    await expect(page.getByTestId("atlas-module-title")).toBeFocused();
    await page.getByTestId("atlas-complete").click();
    await expect(page.evaluate(() => window.localStorage.getItem("kernel-atlas-completed"))).resolves.toBe('["toolchain"]');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByTestId("atlas-next").click();
    await expect(page.getByTestId("atlas-module-title")).toContainText(nextTitle);
    await expect(page.getByTestId("atlas-module-title")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const scrollCall = await page.evaluate(() => {
      const target = window as Window & { __atlasScrollCalls?: Array<{ behavior: ScrollBehavior | undefined; computed: string }> };
      return target.__atlasScrollCalls?.at(-1);
    });
    expect(scrollCall).toEqual({ behavior: "auto", computed: "auto" });
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.evaluate(() => window.localStorage.getItem("kernel-atlas-completed"))).resolves.toBe('["toolchain"]');
  });
}
