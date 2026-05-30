"use strict";
var StealthLightbeaconContentScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/content/content-script.ts
  var content_script_exports = {};
  __export(content_script_exports, {
    buildPageContext: () => buildPageContext,
    isContentExtractMessage: () => isContentExtractMessage
  });

  // src/content/extractor.ts
  var MAX_LINKS = 200;
  function extractPageContext(documentRef, requestUrl) {
    const title = (documentRef.querySelector("title")?.textContent ?? "").trim();
    const lang = (documentRef.documentElement?.getAttribute("lang") ?? "").trim() || null;
    const metaDescription = documentRef.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? null;
    const canonical = documentRef.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ?? null;
    const canonicalNormalized = canonical ? normalizeUrl(canonical, requestUrl) : null;
    const requestNormalized = normalizeComparableUrl(requestUrl);
    const images = [...documentRef.querySelectorAll("img")].map((img) => ({
      src: img.currentSrc || img.src || img.getAttribute("src") || "",
      alt: img.getAttribute("alt"),
      ariaLabel: img.getAttribute("aria-label"),
      role: img.getAttribute("role"),
      formatHint: inferImageFormatHint(img.currentSrc || img.src || img.getAttribute("src") || ""),
      hasQuery: hasQuerySegment(img.currentSrc || img.src || img.getAttribute("src") || ""),
      hasFragment: hasFragmentSegment(img.currentSrc || img.src || img.getAttribute("src") || "")
    }));
    const headings = {
      h1: documentRef.querySelectorAll("h1").length,
      h2: documentRef.querySelectorAll("h2").length,
      h3: documentRef.querySelectorAll("h3").length
    };
    const headingSequence = [...documentRef.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: (heading.textContent ?? "").trim()
    }));
    const headingHierarchy = analyzeHeadingHierarchy(headingSequence);
    const links = [...documentRef.querySelectorAll("a[href]")].slice(0, MAX_LINKS).map((link) => {
      const href = normalizeUrl(link.getAttribute("href") ?? "", requestUrl);
      const quality = buildUrlQuality(href);
      return {
        href,
        text: (link.textContent ?? "").trim().slice(0, 120),
        rel: (link.getAttribute("rel") ?? "").toLowerCase(),
        target: (link.getAttribute("target") ?? "").toLowerCase(),
        ariaLabel: link.getAttribute("aria-label")?.trim() ?? null,
        title: link.getAttribute("title")?.trim() ?? null,
        isInternal: isInternalUrl(href, requestUrl),
        ...quality.isCleanPath ? {} : { quality }
      };
    }).filter((item) => item.href);
    const buttons = [...documentRef.querySelectorAll("button")].map((button) => ({
      text: (button.textContent ?? "").trim(),
      ariaLabel: button.getAttribute("aria-label")?.trim() ?? null,
      title: button.getAttribute("title")?.trim() ?? "",
      type: button.getAttribute("type") ?? ""
    }));
    const labelById = mapLabels(documentRef);
    const formInputs = [...documentRef.querySelectorAll("input,select,textarea")].filter((input) => input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement).map((input) => ({
      required: input.required,
      labelText: getLabelText(input, labelById),
      placeholder: input.getAttribute("placeholder")?.trim() ?? null,
      ariaLabel: input.getAttribute("aria-label")?.trim() ?? null,
      ariaLabelledBy: input.getAttribute("aria-labelledby")?.trim() ?? null,
      title: input.getAttribute("title")?.trim() ?? null,
      type: (input.getAttribute("type") ?? "text").toLowerCase()
    }));
    return {
      requestUrl,
      title,
      lang,
      canonical,
      canonicalSignal: {
        raw: canonical,
        normalized: canonicalNormalized,
        requestNormalized,
        sameOrigin: haveSameOrigin(canonicalNormalized, requestUrl),
        matchesRequest: canonicalNormalized !== null && requestNormalized !== null && canonicalNormalized === requestNormalized
      },
      metaDescription,
      headings,
      headingSequence,
      headingHierarchy,
      images,
      links,
      buttons,
      formInputs
    };
  }
  function analyzeHeadingHierarchy(sequence) {
    const skips = [];
    const regressions = [];
    for (let index = 1; index < sequence.length; index += 1) {
      const previous = sequence[index - 1];
      const current = sequence[index];
      if (current.level > previous.level + 1) {
        skips.push({ fromLevel: previous.level, toLevel: current.level, text: current.text, index });
        continue;
      }
      if (current.level < previous.level) {
        regressions.push({ fromLevel: previous.level, toLevel: current.level, text: current.text, index });
      }
    }
    return { skips, regressions };
  }
  function normalizeUrl(href, baseUrl) {
    try {
      const url = new URL(href, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "";
      }
      return url.toString();
    } catch {
      return "";
    }
  }
  function isInternalUrl(candidate, baseUrl) {
    try {
      return new URL(candidate).origin === new URL(baseUrl).origin;
    } catch {
      return false;
    }
  }
  function normalizeComparableUrl(candidate) {
    try {
      const url = new URL(candidate);
      url.hash = "";
      url.search = "";
      return url.toString();
    } catch {
      return null;
    }
  }
  function haveSameOrigin(candidate, baseUrl) {
    if (!candidate) {
      return false;
    }
    try {
      return new URL(candidate).origin === new URL(baseUrl).origin;
    } catch {
      return false;
    }
  }
  function buildUrlQuality(candidate) {
    try {
      const url = new URL(candidate);
      const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
      const hasTrackingParams = trackingParams.some((param) => url.searchParams.has(param));
      const hasQuery = url.search.length > 0;
      const hasFragment = url.hash.length > 0;
      return {
        hasQuery,
        hasFragment,
        hasTrackingParams,
        isCleanPath: !hasQuery && !hasFragment && !hasTrackingParams
      };
    } catch {
      return {
        hasQuery: false,
        hasFragment: false,
        hasTrackingParams: false,
        isCleanPath: true
      };
    }
  }
  function inferImageFormatHint(candidate) {
    try {
      const pathname = new URL(candidate).pathname.toLowerCase();
      const extension = pathname.split(".").at(-1);
      return extension && extension !== pathname ? extension : null;
    } catch {
      return null;
    }
  }
  function hasQuerySegment(candidate) {
    try {
      return new URL(candidate).search.length > 0;
    } catch {
      return false;
    }
  }
  function hasFragmentSegment(candidate) {
    try {
      return new URL(candidate).hash.length > 0;
    } catch {
      return false;
    }
  }
  function mapLabels(documentRef) {
    const map = /* @__PURE__ */ new Map();
    for (const label of [...documentRef.querySelectorAll("label[for]")]) {
      const fieldId = label.getAttribute("for");
      if (!fieldId) {
        continue;
      }
      map.set(fieldId, (label.textContent ?? "").trim());
    }
    return map;
  }
  function getLabelText(input, labelById) {
    if (input.id && labelById.has(input.id)) {
      return labelById.get(input.id) ?? null;
    }
    const closest = input.closest("label");
    if (closest) {
      return (closest.textContent ?? "").trim();
    }
    const ariaLabel = input.getAttribute("aria-label");
    if (ariaLabel) {
      return ariaLabel.trim();
    }
    return null;
  }

  // src/content/content-script.ts
  function buildPageContext(documentRef, requestUrl) {
    return extractPageContext(documentRef, requestUrl);
  }
  function isContentExtractMessage(message) {
    return !!message && typeof message === "object" && message.type === "content:extract";
  }
  function isContentAxeScanMessage(message) {
    return !!message && typeof message === "object" && message.type === "content:axe-scan";
  }
  function isIssueHighlightMessage(message) {
    return !!message && typeof message === "object" && message.type === "issue:highlight" && typeof message.selector === "string";
  }
  function isClearHighlightMessage(message) {
    return !!message && typeof message === "object" && message.type === "issue:clear-highlight";
  }
  function clearHighlightedElements() {
    document.querySelectorAll('[data-stealth-lightbeacon-highlight="true"]').forEach((node) => {
      if (node instanceof HTMLElement) {
        delete node.dataset.stealthLightbeaconHighlight;
        node.style.outline = "";
        node.style.outlineOffset = "";
      }
    });
  }
  function applyIssueHighlight(selector) {
    clearHighlightedElements();
    const target = document.querySelector(selector);
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.dataset.stealthLightbeaconHighlight = "true";
    target.style.outline = "2px solid #e67e22";
    target.style.outlineOffset = "2px";
  }
  var runtimeHost = typeof globalThis === "undefined" ? {} : globalThis;
  function bindRuntimeListener() {
    const runtime = runtimeHost.chrome?.runtime ?? runtimeHost.browser?.runtime;
    if (!runtime?.onMessage?.addListener) {
      return;
    }
    runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isContentExtractMessage(message) && !isContentAxeScanMessage(message)) {
        if (isIssueHighlightMessage(message)) {
          applyIssueHighlight(message.selector);
          sendResponse({ ok: true });
          return true;
        }
        if (isClearHighlightMessage(message)) {
          clearHighlightedElements();
          sendResponse({ ok: true });
          return true;
        }
        return;
      }
      if (isContentAxeScanMessage(message)) {
        void runAxeScan().then((payload2) => {
          sendResponse({ ok: true, payload: payload2 });
        }).catch((error) => {
          sendResponse({ ok: false, error: String(error) });
        });
        return true;
      }
      const payload = buildPageContext(document, document.location.href);
      sendResponse({ ok: true, payload });
      return true;
    });
  }
  async function runAxeScan() {
    const host = globalThis;
    if (!host.axe?.run) {
      throw new Error("axe runtime is unavailable in content context");
    }
    const result = await host.axe.run();
    const violations = (result.violations ?? []).map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help ?? violation.id,
      description: violation.description ?? "",
      helpUrl: violation.helpUrl ?? "",
      nodes: (violation.nodes ?? []).map((node) => ({
        target: Array.isArray(node.target) ? node.target : [],
        html: node.html ?? "",
        failureSummary: node.failureSummary ?? null
      }))
    }));
    return { violations };
  }
  bindRuntimeListener();
  return __toCommonJS(content_script_exports);
})();
