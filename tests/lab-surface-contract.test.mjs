import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const labs = [
  ["VisualFoundationsEmbedded", "visual-foundations", "visual-foundations-embed"],
  ["KernelForgeEmbedded", "kernel-forge", "kernel-forge-surface"],
  ["CudaSimtEmbedded", "cuda-simt", "cuda-simt-surface"],
  ["GpuMemoryEmbedded", "gpu-memory", "gpu-memory-surface"],
  ["PyTorchTritonEmbedded", "pytorch-triton", "pytorch-triton-surface"],
  ["LlmKernelPatternsEmbedded", "llm-kernel-patterns", "llm-kernel-patterns-surface"],
  ["KernelSafetyEmbedded", "kernel-safety", "kernel-safety-surface"],
  ["NsightBenchmarkEmbedded", "nsight-benchmark", "nsight-benchmark-surface"],
  ["CutlassCuteEmbedded", "cutlass-cute", "cutlass-cute-surface"],
  ["InferenceSystemsEmbedded", "inference-systems", "inference-systems-surface"],
  ["NcclMultiGpuEmbedded", "nccl-multigpu", "nccl-multigpu-surface"],
  ["GpuSoftwareStackEmbedded", "gpu-software-stack", "gpu-software-stack-surface"],
];

function splitSelectors(prelude) {
  const selectors = [];
  let start = 0;
  let parens = 0;
  let brackets = 0;
  for (let index = 0; index < prelude.length; index += 1) {
    const character = prelude[index];
    if (character === "(") parens += 1;
    if (character === ")") parens -= 1;
    if (character === "[") brackets += 1;
    if (character === "]") brackets -= 1;
    if (character === "," && parens === 0 && brackets === 0) {
      selectors.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors.filter(Boolean);
}

function cssSelectors(css, root) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  function parseBlock(start, end, parentRooted = false) {
    let cursor = start;
    let statementStart = start;
    while (cursor < end) {
      if (source[cursor] === "{") {
        const prelude = source.slice(statementStart, cursor).trim();
        let depth = 1;
        let close = cursor + 1;
        while (close < end && depth > 0) {
          if (source[close] === "{") depth += 1;
          if (source[close] === "}") depth -= 1;
          close += 1;
        }
        const bodyEnd = close - 1;
        if (prelude.startsWith("@")) {
          const scopedRoot = prelude.match(/^@scope\s*\(\s*\.([A-Za-z0-9_-]+)/i)?.[1];
          if (!/^@(font-face|keyframes|-[\w-]+keyframes|property)\b/i.test(prelude)) parseBlock(cursor + 1, bodyEnd, parentRooted || scopedRoot === root);
        } else {
          const currentSelectors = splitSelectors(prelude);
          const currentRooted = parentRooted || currentSelectors.every((selector) => selectorHasRoot(selector, root));
          selectors.push(...currentSelectors.map((selector) => ({ selector, rooted: currentRooted })));
          parseBlock(cursor + 1, bodyEnd, currentRooted);
        }
        cursor = close;
        statementStart = close;
        continue;
      }
      if (source[cursor] === ";") statementStart = cursor + 1;
      cursor += 1;
    }
  }
  parseBlock(0, source.length);
  return selectors;
}

function cssRuleEntries(css, root) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const entries = [];
  function parseBlock(start, end, parentRooted = false) {
    let cursor = start;
    let statementStart = start;
    while (cursor < end) {
      if (source[cursor] === "{") {
        const prelude = source.slice(statementStart, cursor).trim();
        let depth = 1;
        let close = cursor + 1;
        while (close < end && depth > 0) {
          if (source[close] === "{") depth += 1;
          if (source[close] === "}") depth -= 1;
          close += 1;
        }
        const bodyEnd = close - 1;
        if (prelude.startsWith("@")) {
          const scopedRoot = prelude.match(/^@scope\s*\(\s*\.([A-Za-z0-9_-]+)/i)?.[1];
          if (!/^@(font-face|keyframes|-[\w-]+keyframes|property)\b/i.test(prelude)) parseBlock(cursor + 1, bodyEnd, parentRooted || scopedRoot === root);
        } else {
          const selectors = splitSelectors(prelude);
          const rooted = parentRooted || selectors.every((selector) => selectorHasRoot(selector, root));
          const declarations = new Map();
          if (!source.slice(cursor + 1, bodyEnd).includes("{")) {
            for (const declaration of source.slice(cursor + 1, bodyEnd).split(";")) {
              const colon = declaration.indexOf(":");
              if (colon === -1) continue;
              const property = declaration.slice(0, colon).trim().toLowerCase();
              const value = declaration.slice(colon + 1).trim();
              if (!property || !value) continue;
              const values = declarations.get(property) ?? [];
              values.push(value);
              declarations.set(property, values);
            }
          }
          entries.push(...selectors.map((selector) => ({
            selector,
            rooted,
            repeatsRoot: parentRooted && selectorHasRoot(selector, root),
            declarations,
          })));
          parseBlock(cursor + 1, bodyEnd, rooted);
        }
        cursor = close;
        statementStart = close;
        continue;
      }
      if (source[cursor] === ";") statementStart = cursor + 1;
      cursor += 1;
    }
  }
  parseBlock(0, source.length);
  return entries;
}

function firstCompound(selector) {
  let parens = 0;
  let brackets = 0;
  let quote = null;
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (character === quote && selector[index - 1] !== "\\") quote = null;
      continue;
    }
    if ((character === "\"" || character === "'") && brackets > 0) quote = character;
    else if (character === "(") parens += 1;
    else if (character === ")") parens -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (parens === 0 && brackets === 0 && (character === ">" || character === "+" || character === "~" || /\s/.test(character))) return selector.slice(0, index);
  }
  return selector;
}

function selectorHasRoot(selector, root) {
  const compound = firstCompound(selector.trim());
  let parens = 0;
  let brackets = 0;
  let quote = null;
  for (let index = 0; index < compound.length; index += 1) {
    const character = compound[index];
    if (quote) {
      if (character === quote && compound[index - 1] !== "\\") quote = null;
      continue;
    }
    if ((character === "\"" || character === "'") && brackets > 0) quote = character;
    else if (character === "(") parens += 1;
    else if (character === ")") parens -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (character === "." && parens === 0 && brackets === 0) {
      const token = compound.slice(index + 1).match(/^[A-Za-z0-9_-]+/i)?.[0];
      if (token === root) return true;
      index += token?.length ?? 0;
    }
  }
  return false;
}

function sectionHasRootClass(source, root) {
  const rootToken = new RegExp(`(?:^|\\s)${root}(?=\\s|$)`);
  return [...source.matchAll(/<section(?:[ \t\r\n]|>)[^>]*>/g)].some(([openingTag]) => {
    const className = openingTag.match(/(?:^|[ \t\r\n])className[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)'|[{][ \t\r\n]*"([^"]*)"[ \t\r\n]*[}]|[{][ \t\r\n]*'([^']*)'[ \t\r\n]*[}])/);
    return Boolean(className && rootToken.test(className[1] ?? className[2] ?? className[3] ?? className[4] ?? ""));
  });
}

function cssRules(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const prelude = match[1].trim();
    if (prelude.startsWith("@")) continue;

    const declarations = new Map();
    for (const declaration of match[2].split(";")) {
      const colon = declaration.indexOf(":");
      if (colon === -1) continue;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim();
      if (!property || !value) continue;
      const values = declarations.get(property) ?? [];
      values.push(value);
      declarations.set(property, values);
    }

    rules.push({ selectors: splitSelectors(prelude), declarations });
  }
  return rules;
}

function cssRulesForSelector(css, expectedSelector) {
  return cssRules(css).filter(({ selectors }) => selectors.includes(expectedSelector));
}

function normalizeCssValue(value) {
  return value.replace(/\s*!important\s*$/i, "").trim().toLowerCase();
}

function visibleFocusDeclarations(declarations) {
  const transparent = (value) => {
    const normalized = normalizeCssValue(value);
    return /\b(?:none|transparent)\b/.test(normalized) ||
      /#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)\b/i.test(normalized) ||
      /rgba?\([^)]*(?:,|\/)\s*(?:0(?:\.0*)?|\.0+)%?\s*\)/i.test(normalized) ||
      /hsla?\([^)]*(?:,|\/)\s*(?:0(?:\.0*)?|\.0+)%?\s*\)/i.test(normalized);
  };
  const outsideFunctions = (value) => normalizeCssValue(value).replace(/[a-z-]+\([^)]*\)/gi, " ");
  const parseLength = (token) => {
    const match = token.match(/^(-?(?:\d+\.?\d*|\.\d+))([a-z%]+)?$/i);
    if (!match) return null;
    const number = Number(match[1]);
    if (!match[2] && number !== 0) return null;
    return number;
  };
  const positiveOutlineWidth = (value) => {
    const normalized = normalizeCssValue(value);
    if (/\b(?:thin|medium|thick)\b/.test(normalized)) return true;
    return outsideFunctions(normalized).split(/\s+/).filter(Boolean)
      .some((token) => (parseLength(token) ?? 0) > 0);
  };
  const outlineVisible = (value) => {
    const normalized = normalizeCssValue(value);
    return !transparent(normalized) &&
      /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.test(normalized) &&
      positiveOutlineWidth(normalized);
  };
  const outlineShorthand = (declarations.get("outline") ?? []).some(outlineVisible);
  const outlineLonghand = (declarations.get("outline-style") ?? []).some((value) =>
    /^(?:solid|dashed|dotted|double|groove|ridge|inset|outset)$/i.test(normalizeCssValue(value)),
  ) && (declarations.get("outline-width") ?? []).some(positiveOutlineWidth) &&
    (declarations.get("outline-color") ?? ["currentcolor"]).some((value) => !transparent(value));
  const shadowVisible = (declarations.get("box-shadow") ?? []).some((value) =>
    splitSelectors(normalizeCssValue(value)).some((shadow) => {
      if (transparent(shadow)) return false;
      const lengths = outsideFunctions(shadow).split(/\s+/).filter(Boolean)
        .map(parseLength).filter((length) => length !== null);
      if (lengths.length < 2) return false;
      const [offsetX, offsetY, blur = 0, spread = 0] = lengths;
      if (blur < 0 || spread < 0) return false;
      return Math.abs(offsetX) > 0 || Math.abs(offsetY) > 0 || blur > 0 || spread > 0;
    }),
  );
  return outlineShorthand || outlineLonghand || shadowVisible;
}

function hasEffectiveReducedMotion(css) {
  const blocks = reducedMotionBlocks(css);
  let hasDisable = false;
  for (const block of blocks) {
    for (const { declarations } of cssRules(block)) {
      if ((declarations.get("animation-play-state") ?? []).some((value) => normalizeCssValue(value) === "paused")) hasDisable = true;
      for (const property of ["animation", "transition", "animation-duration", "transition-duration"]) {
        for (const value of declarations.get(property) ?? []) {
          const normalized = normalizeCssValue(value);
          if ((property === "animation" || property === "transition") && /(?:^|\s)none(?:\s|$)/i.test(normalized)) {
            hasDisable = true;
          }
          const times = [...normalized.matchAll(/(-?\d*\.?\d+)(ms|s)\b/gi)]
            .map((match) => Number(match[1]) * (match[2].toLowerCase() === "s" ? 1000 : 1));
          if (times.some((duration) => Math.abs(duration) > 10)) return false;
          if (times.length > 0 && times.every((duration) => Math.abs(duration) <= 10)) hasDisable = true;
        }
      }
    }
  }
  return blocks.length > 0 && hasDisable;
}

function assertVisibleFocusContract(css, root, selectorFragment = ":focus-visible") {
  const matches = cssRuleEntries(css, root).filter(({ selector, rooted }) => rooted && selector.includes(selectorFragment));
  assert.ok(matches.length > 0, `${root} has no rooted ${selectorFragment} rule`);
  assert.ok(matches.every(({ repeatsRoot }) => !repeatsRoot), `${root} rooted focus selector repeats its root`);
  assert.ok(matches.some(({ declarations }) => visibleFocusDeclarations(declarations)), `${root} ${selectorFragment} has no visible focus declaration`);
}

function assertSelectorDeclarations(css, selector, declarations) {
  const rules = cssRulesForSelector(css, selector);
  assert.ok(rules.length > 0, `missing overflow constraint selector: ${selector}`);
  for (const [property, expectedValue] of declarations) {
    assert.ok(
      rules.some(({ declarations: ruleDeclarations }) =>
        (ruleDeclarations.get(property) ?? []).some(
          (value) => normalizeCssValue(value) === expectedValue,
        ),
      ),
      `${selector} must declare ${property}: ${expectedValue}`,
    );
  }
}

function assertSelectorDoesNotDeclare(css, selector, property, forbiddenValue) {
  const rules = cssRulesForSelector(css, selector);
  assert.ok(rules.length > 0, `missing selector: ${selector}`);
  for (const { declarations } of rules) {
    for (const value of declarations.get(property) ?? []) {
      assert.notEqual(
        normalizeCssValue(value),
        forbiddenValue,
        `${selector} must not declare ${property}: ${forbiddenValue}`,
      );
    }
  }
}

const INFERENCE_REQUIRED_DECLARATIONS = [
  [".inference-systems-surface .lesson-flow", [["min-width", "0"]]],
  [".inference-systems-surface .result-metric", [["min-width", "0"]]],
  [".inference-systems-surface .cost-chart > div", [["min-width", "0"], ["flex-wrap", "wrap"]]],
  [".inference-systems-surface .memory-calc", [["min-width", "0"]]],
  [".inference-systems-surface .decision-card", [["min-width", "0"]]],
  [".inference-systems-surface .metric-grid article", [["min-width", "0"]]],
  [".inference-systems-surface .graph-lab-copy label", [["flex-wrap", "wrap"]]],
  [".inference-systems-surface .memory-calc label", [["flex-wrap", "wrap"]]],
  [".inference-systems-surface", [["max-width", "100%"]]],
  [".inference-systems-surface .result-board", [["max-width", "100%"]]],
  [".inference-systems-surface .cost-chart", [["max-width", "100%"]]],
  [".inference-systems-surface .memory-output", [["max-width", "100%"]]],
  [".inference-systems-surface .benchmark-card", [["max-width", "100%"]]],
];

function isContentBreakingWidth(value) {
  const normalized = normalizeCssValue(value);
  if (/(?:^|[^a-z])(?:vw|svw|lvw|dvw|vmin|vmax)(?:$|[^a-z])/i.test(normalized)) {
    return true;
  }
  return [...normalized.matchAll(/(-?\d*\.?\d+)px\b/gi)].some(
    ([, pixels]) => Number(pixels) >= 300,
  );
}

function assertInferenceOverflowContract(css) {
  for (const [selector, declarations] of INFERENCE_REQUIRED_DECLARATIONS) {
    assertSelectorDeclarations(css, selector, declarations);
  }

  for (const { selectors, declarations } of cssRules(css)) {
    for (const property of ["width", "min-width"]) {
      for (const value of declarations.get(property) ?? []) {
        assert.ok(
          !isContentBreakingWidth(value),
          `${selectors.join(", ")} has content-breaking ${property}: ${value}`,
        );
      }
    }
  }
}

function assertAtlasContentDoesNotMaskOverflow(css) {
  const rules = cssRulesForSelector(css, ".atlas-content");
  assert.ok(rules.length > 0, "missing shell boundary selector: .atlas-content");
  for (const { declarations } of rules) {
    for (const property of ["overflow", "overflow-x"]) {
      for (const value of declarations.get(property) ?? []) {
        assert.ok(
          !/(?:^|\s)(?:hidden|clip)(?:\s|$)/i.test(normalizeCssValue(value)),
          `.atlas-content must not declare ${property}: ${value}`,
        );
      }
    }
  }
}

function parseTsx(source, name = "fixture.tsx") {
  return ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function jsxAttribute(opening, name) {
  return opening.attributes.properties.find(
    (attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === name,
  );
}

function jsxAttributeText(opening, name) {
  const attribute = jsxAttribute(opening, name);
  if (!attribute?.initializer) return "";
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) return attribute.initializer.expression?.getText() ?? "";
  return attribute.initializer.getText();
}

function expressionProvidesText(expression) {
  if (!expression) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword || expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return /[\p{L}\p{N}]/u.test(expression.text);
  }
  if (ts.isConditionalExpression(expression)) {
    return expressionProvidesText(expression.whenTrue) || expressionProvidesText(expression.whenFalse);
  }
  if (ts.isParenthesizedExpression(expression)) return expressionProvidesText(expression.expression);
  if (ts.isJsxSelfClosingElement(expression)) return false;
  if (ts.isJsxElement(expression) || ts.isJsxFragment(expression)) return jsxChildrenProvideText(expression.children);
  return true;
}

function jsxChildProvidesText(child) {
  if (ts.isJsxText(child)) return /[\p{L}\p{N}]/u.test(child.text);
  if (ts.isJsxExpression(child)) return expressionProvidesText(child.expression);
  if (ts.isJsxElement(child)) {
    if (jsxAttributeText(child.openingElement, "aria-hidden") === "true") return false;
    return jsxChildrenProvideText(child.children);
  }
  return false;
}

function jsxChildrenProvideText(children) {
  return children.some(jsxChildProvidesText);
}

function unnamedIconButtons(source, name = "fixture.tsx") {
  const failures = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "button") {
      const hasAccessibleName = Boolean(
        jsxAttributeText(node.openingElement, "aria-label") ||
          jsxAttributeText(node.openingElement, "aria-labelledby"),
      );
      if (!hasAccessibleName && !jsxChildrenProvideText(node.children)) {
        failures.push(`${name}:${node.getStart(parseTsx(source, name))}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  const tree = parseTsx(source, name);
  ts.forEachChild(tree, visit);
  return failures;
}

function openingHasClassAndAttribute(source, classToken, attributeName, attributeValue) {
  const tree = parseTsx(source);
  let found = false;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const classes = jsxAttributeText(node, "className");
      const classPattern = new RegExp(`(?:^|[^A-Za-z0-9_-])${classToken}(?=$|[^A-Za-z0-9_-])`);
      if (classPattern.test(classes) && jsxAttributeText(node, attributeName) === attributeValue) found = true;
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(tree, visit);
  return found;
}

function openingHasClass(opening, classToken) {
  const classes = jsxAttributeText(opening, "className");
  return new RegExp(`(?:^|[^A-Za-z0-9_-])${classToken}(?=$|[^A-Za-z0-9_-])`).test(classes);
}

function conditionallyMountedClassElements(source, classTokens, name = "fixture.tsx") {
  const tree = parseTsx(source, name);
  const failures = [];
  function visit(node) {
    if (ts.isJsxElement(node) && classTokens.some((classToken) => openingHasClass(node.openingElement, classToken))) {
      let ancestor = node.parent;
      while (ancestor && !ts.isSourceFile(ancestor)) {
        if (ts.isJsxElement(ancestor)) break;
        if (ts.isConditionalExpression(ancestor) ||
            (ts.isBinaryExpression(ancestor) && ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
          failures.push(classTokens.find((classToken) => openingHasClass(node.openingElement, classToken)));
          break;
        }
        ancestor = ancestor.parent;
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(tree, visit);
  return failures;
}

function hasFocusableNonInteractiveRegion(source) {
  const tree = parseTsx(source);
  let found = false;
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        !["a", "button", "input", "select", "textarea"].includes(node.tagName.getText()) &&
        jsxAttributeText(node, "tabIndex") === "0") found = true;
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(tree, visit);
  return found;
}

function reducedMotionBlocks(css) {
  const blocks = [];
  for (const match of css.matchAll(/@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{/gi)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    const start = cursor;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === "{") depth += 1;
      if (css[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    blocks.push(css.slice(start, cursor - 1));
  }
  return blocks;
}

test("recognizes only an actual root class in the first selector compound", () => {
  assert.equal(selectorHasRoot(".other.kernel-forge-surface .child", "kernel-forge-surface"), true);
  assert.equal(selectorHasRoot("div .kernel-forge-surface", "kernel-forge-surface"), false);
  assert.equal(selectorHasRoot('[data-x=".kernel-forge-surface"]', "kernel-forge-surface"), false);
  assert.equal(selectorHasRoot(":is(.kernel-forge-surface, .global)", "kernel-forge-surface"), false);
  assert.equal(cssSelectors(".kernel-forge-surface { & .child { color: red; } }", "kernel-forge-surface").every(({ rooted }) => rooted), true);
  assert.equal(cssSelectors(".global { & .child { color: red; } }", "kernel-forge-surface").every(({ rooted }) => rooted), false);
});

test("accepts only direct static section className literals", () => {
  assert.equal(sectionHasRootClass('<section className="other kernel-forge-surface" />', "kernel-forge-surface"), true);
  assert.equal(sectionHasRootClass(`<section className={"other kernel-forge-surface"} />`, "kernel-forge-surface"), true);
  assert.equal(sectionHasRootClass('<section className={cx("kernel-forge-surface", conditionalClass)} />', "kernel-forge-surface"), false);
  assert.equal(sectionHasRootClass('<section className="not-kernel-forge-surface" />', "kernel-forge-surface"), false);
  assert.equal(sectionHasRootClass('<sectional className="kernel-forge-surface" />', "kernel-forge-surface"), false);
  assert.equal(sectionHasRootClass('<section data-className="kernel-forge-surface" />', "kernel-forge-surface"), false);
  assert.equal(sectionHasRootClass('<section className={\n  "kernel-forge-surface"\n} />', "kernel-forge-surface"), true);
});

test("laboratories render section surfaces rather than nested documents", async () => {
  for (const [component, , root] of labs) {
    for (const suffix of ["", ".en"]) {
      const source = await readFile(new URL(`../app/${component}${suffix}.tsx`, import.meta.url), "utf8");
      assert.ok(sectionHasRootClass(source, root), `${component}${suffix} has no section with exact .${root} class token`);
      assert.doesNotMatch(source, /<main\b|<h1\b|<footer\b/);
    }
  }
});

test("laboratory styles are rooted and contain no broad element rules", async () => {
  for (const [, cssName, root] of labs) {
    const css = await readFile(new URL(`../app/${cssName}.css`, import.meta.url), "utf8");
    const selectors = cssSelectors(css, root);
    assert.ok(selectors.some(({ rooted }) => rooted), `${cssName} has no selector rooted at .${root}`);
    for (const { selector, rooted } of selectors) assert.ok(rooted, `${cssName} has unrooted selector: ${selector}`);
  }
});

test("keeps CSS selector-list and nested-media isolation strict", () => {
  assert.equal(cssSelectors(".kernel-forge-surface, .global { color: red; }", "kernel-forge-surface").every(({ rooted }) => rooted), false);
  assert.equal(cssSelectors("@media (min-width: 1px) { .global { color: red; } }", "kernel-forge-surface").every(({ rooted }) => rooted), false);
});

test("overflow contract helpers fail closed without substring false positives", () => {
  assert.doesNotThrow(() =>
    assertAtlasContentDoesNotMaskOverflow(`
      .atlas-content { min-width: 0; overflow: auto; }
      .local-module-scroller { overflow-x: auto; }
      .not-atlas-content { overflow: hidden; }
    `),
  );
  assert.throws(
    () => assertAtlasContentDoesNotMaskOverflow(".atlas-content { overflow : hidden auto !important; }"),
    /must not declare overflow/,
  );
  assert.throws(
    () => assertAtlasContentDoesNotMaskOverflow(".atlas-content { overflow-x:\n hidden; }"),
    /must not declare overflow-x/,
  );
  assert.throws(
    () => assertAtlasContentDoesNotMaskOverflow(".atlas-content { overflow-x: clip; }"),
    /must not declare overflow-x/,
  );
});

test("current inference and shell overflow CSS passes mutation-sensitive guards", async () => {
  const inferenceCss = await readFile(new URL("../app/inference-systems.css", import.meta.url), "utf8");
  const shellCss = await readFile(new URL("../app/atlas/atlas-shell.css", import.meta.url), "utf8");

  assert.doesNotThrow(() => assertInferenceOverflowContract(inferenceCss));
  assert.doesNotThrow(() => assertAtlasContentDoesNotMaskOverflow(shellCss));

  const withoutLessonFlow = inferenceCss.replace(
    ".inference-systems-surface .lesson-flow,\n",
    "",
  );
  assert.notEqual(withoutLessonFlow, inferenceCss, "lesson-flow mutation fixture must alter the CSS");
  assert.throws(
    () => assertInferenceOverflowContract(withoutLessonFlow),
    /missing overflow constraint selector: \.inference-systems-surface \.lesson-flow/,
  );

  assert.throws(
    () => assertInferenceOverflowContract(`${inferenceCss}\n.result-metric { width: 100vw; }`),
    /result-metric has content-breaking width: 100vw/,
  );
  assert.throws(
    () => assertInferenceOverflowContract(`${inferenceCss}\n.result-metric { min-width: 400px; }`),
    /result-metric has content-breaking min-width: 400px/,
  );
  assert.throws(
    () => assertAtlasContentDoesNotMaskOverflow(`${shellCss}\n.atlas-content { overflow-x : hidden; }`),
    /must not declare overflow-x/,
  );
  assert.throws(
    () => assertAtlasContentDoesNotMaskOverflow(`${shellCss}\n.atlas-content { overflow : clip; }`),
    /must not declare overflow/,
  );
});

test("software-stack and NCCL interactive controls expose names, 44px targets, thin tracks, and focus", async () => {
  const [softwareTr, softwareEn, softwareCss, ncclCss] = await Promise.all([
    readFile(new URL("../app/GpuSoftwareStackEmbedded.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/GpuSoftwareStackEmbedded.en.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/gpu-software-stack.css", import.meta.url), "utf8"),
    readFile(new URL("../app/nccl-multigpu.css", import.meta.url), "utf8"),
  ]);

  assert.match(softwareTr, /<button(?=[^>]*role="switch")(?=[^>]*aria-label="Birleştirme")[^>]*>/);
  assert.match(softwareEn, /<button(?=[^>]*role="switch")(?=[^>]*aria-label="Fusion")[^>]*>/);

  assertSelectorDeclarations(softwareCss, ".lab-controls select", [["min-height", "44px"]]);
  assertSelectorDoesNotDeclare(softwareCss, ".lab-controls select", "outline", "none");
  assertSelectorDeclarations(softwareCss, ".toggle", [["min-width", "44px"], ["min-height", "44px"]]);
  assertSelectorDeclarations(softwareCss, ":is(button, a, input, select):focus-visible", [["outline", "3px solid #55d6ff"]]);

  assertSelectorDeclarations(ncclCss, '.controls input[type="range"]', [["min-height", "44px"], ["background", "transparent"]]);
  assertSelectorDeclarations(ncclCss, '.controls input[type="range"]::-webkit-slider-runnable-track', [["height", "4px"]]);
  assertSelectorDeclarations(ncclCss, '.controls input[type="range"]::-moz-range-track', [["height", "4px"]]);
  assertSelectorDeclarations(ncclCss, ":is(button,a,input):focus-visible", [["outline", "3px solid var(--cyan)"]]);
});

test("icon-only laboratory buttons expose an accessible name", async () => {
  assert.deepEqual(unnamedIconButtons('<button><i aria-hidden="true">×</i></button>'), ["fixture.tsx:0"]);
  assert.deepEqual(unnamedIconButtons("<button>{null}</button>"), ["fixture.tsx:0"]);
  assert.deepEqual(unnamedIconButtons("<button>{<Icon />}</button>"), ["fixture.tsx:0"]);
  assert.deepEqual(unnamedIconButtons('<button aria-label="Close"><i aria-hidden="true">×</i></button>'), []);
  assert.deepEqual(unnamedIconButtons("<button>{label}</button>"), []);
  assert.deepEqual(unnamedIconButtons("<button>Visible label</button>"), []);

  const failures = [];
  for (const [component] of labs) {
    for (const suffix of ["", ".en"]) {
      const name = `${component}${suffix}.tsx`;
      const source = await readFile(new URL(`../app/${name}`, import.meta.url), "utf8");
      failures.push(...unnamedIconButtons(source, name));
    }
  }
  assert.deepEqual(failures, []);
});

test("focus and reduced-motion helpers reject cosmetic or ineffective declarations", () => {
  assert.doesNotThrow(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 3px solid #fff; } }", "surface"));
  assert.doesNotThrow(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 3px solid rgb(255 255 255); } }", "surface"));
  assert.doesNotThrow(() => assertVisibleFocusContract(".surface { button:focus-visible { box-shadow: 0 0 0 3px #fff; } }", "surface"));
  assert.doesNotThrow(() => assertVisibleFocusContract(".surface { button:focus-visible { box-shadow: 0 0 4px 0 rgb(255 255 255); } }", "surface"));
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: none; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 0 solid #fff; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 0px solid #fff; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 0 solid rgb(255 255 255); } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 3px solid #0000; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { outline: 3px solid transparent; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { box-shadow: 0 0 0 #fff; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { box-shadow: 0 0 0 -5px #fff; } }", "surface"), /no visible focus declaration/);
  assert.throws(() => assertVisibleFocusContract(".surface { button:focus-visible { box-shadow: 0 0 transparent; } }", "surface"), /no visible focus declaration/);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{animation-duration:.01ms}}"), true);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{animation-duration:99s}}"), false);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{scroll-behavior:auto}}"), false);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{scroll-behavior:auto;animation-duration:99s}}"), false);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{animation:none}.surface .slow{transition-duration:99s}}"), false);
  assert.equal(hasEffectiveReducedMotion("@media(prefers-reduced-motion:reduce){.surface *{scroll-behavior:auto;animation:none}}"), true);
  assert.throws(() => assertVisibleFocusContract(".surface { .surface [tabindex=\"0\"]:focus-visible { outline: 3px solid #fff; } }", "surface"), /rooted focus selector repeats its root/);
});

test("every laboratory surface has rooted focus-visible and reduced-motion safeguards", async () => {
  const failures = [];
  for (const [, cssName, root] of labs) {
    const css = await readFile(new URL(`../app/${cssName}.css`, import.meta.url), "utf8");
    try { assertVisibleFocusContract(css, root); } catch (error) { failures.push(`${cssName}: ${error.message}`); }
    if (!hasEffectiveReducedMotion(css)) failures.push(`${cssName}: reduced-motion block does not effectively disable load-bearing motion`);
  }
  assert.deepEqual(failures, []);
});

test("every focusable laboratory scroller has a rooted visible focus treatment", async () => {
  const failures = [];
  for (const [component, cssName, root] of labs) {
    const [tr, en, css] = await Promise.all([
      readFile(new URL(`../app/${component}.tsx`, import.meta.url), "utf8"),
      readFile(new URL(`../app/${component}.en.tsx`, import.meta.url), "utf8"),
      readFile(new URL(`../app/${cssName}.css`, import.meta.url), "utf8"),
    ]);
    if (!hasFocusableNonInteractiveRegion(tr) && !hasFocusableNonInteractiveRegion(en)) continue;
    try { assertVisibleFocusContract(css, root, '[tabindex="0"]:focus-visible'); }
    catch (error) { failures.push(`${cssName}: ${error.message}`); }
  }
  assert.deepEqual(failures, []);
});

test("discrete laboratory feedback is polite and no laboratory uses assertive live regions", async () => {
  const requiredLiveRegions = new Map([
    ["KernelForgeEmbedded", ["output-pane", "answer"]],
    ["GpuMemoryEmbedded", ["selected-detail", "transaction-summary", "bank-explanation"]],
    ["PyTorchTritonEmbedded", ["console", "feedback"]],
    ["LlmKernelPatternsEmbedded", ["quiz-note"]],
    ["KernelSafetyEmbedded", ["score"]],
    ["NsightBenchmarkEmbedded", ["diagnosis-content", "question-feedback"]],
    ["CutlassCuteEmbedded", ["quiz-feedback"]],
    ["InferenceSystemsEmbedded", ["diagnosis", "quiz-feedback"]],
    ["NcclMultiGpuEmbedded", ["strategy-detail", "answer"]],
    ["GpuSoftwareStackEmbedded", ["decision-output", "step-detail", "lab-output"]],
  ]);
  const failures = [];
  for (const [component] of labs) {
    for (const suffix of ["", ".en"]) {
      const name = `${component}${suffix}.tsx`;
      const source = await readFile(new URL(`../app/${name}`, import.meta.url), "utf8");
      if (/aria-live\s*=\s*["'{]assertive/i.test(source)) failures.push(`${name}: assertive live region`);
      if (component === "CudaSimtEmbedded" && openingHasClassAndAttribute(source, "detail-card", "aria-live", "polite")) {
        failures.push(`${name}: continuously updated .detail-card must not be aria-live`);
      }
      for (const classToken of requiredLiveRegions.get(component) ?? []) {
        if (!openingHasClassAndAttribute(source, classToken, "aria-live", "polite")) {
          failures.push(`${name}: .${classToken} is not aria-live=polite`);
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("discrete conditional status containers stay mounted before their content changes", async () => {
  const mountedStatuses = new Map([
    ["KernelForgeEmbedded", ["answer"]],
    ["PyTorchTritonEmbedded", ["feedback"]],
    ["LlmKernelPatternsEmbedded", ["quiz-note"]],
    ["KernelSafetyEmbedded", ["score"]],
    ["NsightBenchmarkEmbedded", ["question-feedback"]],
    ["CutlassCuteEmbedded", ["quiz-feedback"]],
    ["InferenceSystemsEmbedded", ["quiz-feedback"]],
    ["NcclMultiGpuEmbedded", ["answer"]],
  ]);
  const failures = [];
  for (const [component, classes] of mountedStatuses) {
    for (const suffix of ["", ".en"]) {
      const name = `${component}${suffix}.tsx`;
      const source = await readFile(new URL(`../app/${name}`, import.meta.url), "utf8");
      for (const classToken of conditionallyMountedClassElements(source, classes, name)) {
        failures.push(`${name}: .${classToken} is conditionally mounted`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
