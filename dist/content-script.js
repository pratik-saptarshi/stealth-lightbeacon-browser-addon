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
    const images = [...documentRef.querySelectorAll("img")].map((img) => ({
      src: img.currentSrc || img.src || img.getAttribute("src") || "",
      alt: img.getAttribute("alt"),
      ariaLabel: img.getAttribute("aria-label"),
      role: img.getAttribute("role")
    }));
    const headings = {
      h1: documentRef.querySelectorAll("h1").length,
      h2: documentRef.querySelectorAll("h2").length,
      h3: documentRef.querySelectorAll("h3").length
    };
    const links = [...documentRef.querySelectorAll("a[href]")].slice(0, MAX_LINKS).map((link) => {
      const href = normalizeUrl(link.getAttribute("href") ?? "", requestUrl);
      return {
        href,
        text: (link.textContent ?? "").trim().slice(0, 120),
        rel: (link.getAttribute("rel") ?? "").toLowerCase(),
        target: (link.getAttribute("target") ?? "").toLowerCase(),
        isInternal: isInternalUrl(href, requestUrl)
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
      type: (input.getAttribute("type") ?? "text").toLowerCase()
    }));
    return {
      requestUrl,
      title,
      lang,
      canonical,
      metaDescription,
      headings,
      images,
      links,
      buttons,
      formInputs
    };
  }
  function normalizeUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).toString();
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
  var runtimeHost = typeof globalThis === "undefined" ? {} : globalThis;
  function bindRuntimeListener() {
    const runtime = runtimeHost.chrome?.runtime ?? runtimeHost.browser?.runtime;
    if (!runtime?.onMessage?.addListener) {
      return;
    }
    runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isContentExtractMessage(message)) {
        return;
      }
      const payload = buildPageContext(document, document.location.href);
      sendResponse({ ok: true, payload });
      return true;
    });
  }
  bindRuntimeListener();
  return __toCommonJS(content_script_exports);
})();
