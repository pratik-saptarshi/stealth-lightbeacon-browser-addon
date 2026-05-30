// src/shared/message-contracts.ts
function isScanStartMessage(input) {
  return !!input && typeof input === "object" && input.type === "scan:start";
}
function createFailure(error) {
  return `Scan failed: ${String(error)}`;
}

// src/shared/contracts.ts
function createSchema(parser) {
  return {
    parse: parser
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value) {
  return typeof value === "string";
}
function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isNonNegativeNumber(value) {
  return isFiniteNumber(value) && value >= 0;
}
function isPositiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}
function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}
function isNonNegativeInteger(value) {
  return isInteger(value) && value >= 0;
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
function isEnumValue(value, allowed) {
  return isString(value) && allowed.includes(value);
}
var SEVERITIES = ["critical", "high", "medium", "low"];
var DOMAINS = [
  "seo",
  "performance",
  "accessibility",
  "aeo",
  "ux",
  "drupal",
  "geo",
  "security-headers",
  "WCAG2.1AA",
  "WCAG2.2AA"
];
var ISSUE_SOURCES = ["dom-only", "backend"];
var BACKEND_ENGINES = ["http", "fast-obscura", "stealth-playwright", "mcp"];
var SCAN_ENGINES = ["dom-lite", "crawl-lite"];
var BACKEND_MODES = ["http", "stdin"];
var CRAWL_ERROR_TYPES = ["cors", "timeout", "blocked", "non_html", "other"];
function assertIssueCountsBySeverity(input, path) {
  assert(isRecord(input), `${path} must be an object`);
  for (const key of SEVERITIES) {
    assert(isNonNegativeNumber(input[key]), `${path}.${key} must be a non-negative number`);
  }
  const counts = input;
  return {
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low
  };
}
function assertIssueCountsByDomain(input, path) {
  assert(isRecord(input), `${path} must be an object`);
  for (const [key, value] of Object.entries(input)) {
    assert(isNonNegativeNumber(value), `${path}.${key} must be a non-negative number`);
  }
  for (const key of DOMAINS) {
    if (!(key in input)) {
      continue;
    }
    assert(isNonNegativeNumber(input[key]), `${path}.${key} must be a non-negative number`);
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value])
  );
}
function assertIssue(input) {
  assert(isRecord(input), "issue must be an object");
  assert(isNonEmptyString(input.id), "issue.id must be a non-empty string");
  assert(isNonEmptyString(input.ruleId), "issue.ruleId must be a non-empty string");
  assert(isNonEmptyString(input.title), "issue.title must be a non-empty string");
  assert(isEnumValue(input.severity, SEVERITIES), "issue.severity must be one of critical, high, medium, low");
  assert(isEnumValue(input.domain, DOMAINS), "issue.domain must be a supported domain");
  assert(isNonEmptyString(input.summary), "issue.summary must be a non-empty string");
  assert(isNonEmptyString(input.evidence), "issue.evidence must be a non-empty string");
  if ("selector" in input && input.selector !== void 0) {
    assert(isString(input.selector), "issue.selector must be a string when present");
  }
  assert(isEnumValue(input.source, ISSUE_SOURCES), "issue.source must be dom-only or backend");
  return {
    id: input.id,
    ruleId: input.ruleId,
    title: input.title,
    severity: input.severity,
    domain: input.domain,
    summary: input.summary,
    evidence: input.evidence,
    selector: input.selector,
    source: input.source
  };
}
function assertEngineRecommendation(input) {
  assert(isRecord(input), "recommendation must be an object");
  assert(isEnumValue(input.engine, BACKEND_ENGINES), "recommendation.engine must be a supported backend engine");
  assert(isNonEmptyString(input.reason), "recommendation.reason must be a non-empty string");
  assert(isFiniteNumber(input.confidence) && input.confidence >= 0 && input.confidence <= 1, "recommendation.confidence must be between 0 and 1");
  return {
    engine: input.engine,
    reason: input.reason,
    confidence: input.confidence
  };
}
function assertCrawlNode(input) {
  assert(isRecord(input), "crawl node must be an object");
  assert(isNonEmptyString(input.url), "crawl node.url must be a non-empty string");
  assert(isNonNegativeInteger(input.depth), "crawl node.depth must be a non-negative integer");
  assert(isEnumValue(input.status, ["queued", "running", "done", "error"]), "crawl node.status must be queued, running, done, or error");
  if ("errorType" in input && input.errorType !== void 0) {
    assert(isEnumValue(input.errorType, CRAWL_ERROR_TYPES), "crawl node.errorType is invalid");
  }
  if ("discoveredFrom" in input && input.discoveredFrom !== void 0) {
    assert(isNonEmptyString(input.discoveredFrom), "crawl node.discoveredFrom must be a non-empty string when present");
  }
  if ("finalUrl" in input && input.finalUrl !== void 0) {
    assert(isNonEmptyString(input.finalUrl), "crawl node.finalUrl must be a non-empty string when present");
  }
  if ("statusCode" in input && input.statusCode !== void 0) {
    assert(isNonNegativeNumber(input.statusCode), "crawl node.statusCode must be a non-negative number when present");
  }
  if ("note" in input && input.note !== void 0) {
    assert(isString(input.note), "crawl node.note must be a string when present");
  }
  return {
    url: input.url,
    depth: input.depth,
    status: input.status,
    errorType: input.errorType,
    discoveredFrom: input.discoveredFrom,
    finalUrl: input.finalUrl,
    statusCode: input.statusCode,
    note: input.note
  };
}
function assertScanRequestInput(input) {
  assert(isRecord(input), "scan request must be an object");
  assert(isNonEmptyString(input.requestId), "scan request.requestId must be a non-empty string");
  assert(isNonEmptyString(input.url), "scan request.url must be a non-empty string");
  assert(isEnumValue(input.engine, SCAN_ENGINES), "scan request.engine must be dom-lite or crawl-lite");
  try {
    new URL(input.url);
  } catch {
    throw new Error("scan request.url must be a valid URL");
  }
  if ("tabId" in input && input.tabId !== void 0) {
    assert(isNonNegativeInteger(input.tabId), "scan request.tabId must be a non-negative integer when present");
  }
  if ("crawlDepth" in input && input.crawlDepth !== void 0) {
    assert(isNonNegativeInteger(input.crawlDepth) && input.crawlDepth <= 4, "scan request.crawlDepth must be a non-negative integer no greater than 4");
  }
  if ("crawlMaxUrls" in input && input.crawlMaxUrls !== void 0) {
    assert(isNonNegativeInteger(input.crawlMaxUrls) && input.crawlMaxUrls <= 500, "scan request.crawlMaxUrls must be a non-negative integer no greater than 500");
  }
  if ("ruleCategories" in input && input.ruleCategories !== void 0) {
    assert(Array.isArray(input.ruleCategories) && input.ruleCategories.length > 0, "scan request.ruleCategories must be a non-empty array when present");
    assert(input.ruleCategories.every((entry) => isEnumValue(entry, DOMAINS)), "scan request.ruleCategories contains unsupported domain values");
  }
  if ("accessibilityProfile" in input && input.accessibilityProfile !== void 0) {
    assert(isRecord(input.accessibilityProfile), "scan request.accessibilityProfile must be an object when present");
    const profile = input.accessibilityProfile;
    assert(isEnumValue(profile.wcagLevel, ["A", "AA", "AAA"]), "scan request.accessibilityProfile.wcagLevel must be A, AA, or AAA");
    assert(typeof profile.includeBestPractices === "boolean", "scan request.accessibilityProfile.includeBestPractices must be a boolean");
  }
  if ("backend" in input && input.backend !== void 0) {
    assert(isRecord(input.backend), "scan request.backend must be an object when present");
    const backend = input.backend;
    if ("enabled" in backend && backend.enabled !== void 0) {
      assert(typeof backend.enabled === "boolean", "scan request.backend.enabled must be a boolean when present");
    }
    if ("mode" in backend && backend.mode !== void 0) {
      assert(isEnumValue(backend.mode, BACKEND_MODES), "scan request.backend.mode must be http or stdin");
    }
    if ("engine" in backend && backend.engine !== void 0) {
      assert(isEnumValue(backend.engine, BACKEND_ENGINES), "scan request.backend.engine must be a supported backend engine");
    }
    if ("endpoint" in backend && backend.endpoint !== void 0) {
      assert(isNonEmptyString(backend.endpoint), "scan request.backend.endpoint must be a non-empty string");
      try {
        new URL(backend.endpoint);
      } catch {
        throw new Error("scan request.backend.endpoint must be a valid URL");
      }
    }
    if ("allowedHosts" in backend && backend.allowedHosts !== void 0) {
      assert(isStringArray(backend.allowedHosts), "scan request.backend.allowedHosts must be an array of non-empty strings");
    }
    if ("requestSigningSecret" in backend && backend.requestSigningSecret !== void 0) {
      assert(isNonEmptyString(backend.requestSigningSecret) && backend.requestSigningSecret.length <= 256, "scan request.backend.requestSigningSecret must be 1-256 characters");
    }
    if ("auth" in backend && backend.auth !== void 0) {
      assert(isRecord(backend.auth), "scan request.backend.auth must be an object");
      assert(isNonEmptyString(backend.auth.username), "scan request.backend.auth.username must be a non-empty string");
      assert(isNonEmptyString(backend.auth.password), "scan request.backend.auth.password must be a non-empty string");
    }
    if ("timeoutMs" in backend && backend.timeoutMs !== void 0) {
      assert(isPositiveNumber(backend.timeoutMs), "scan request.backend.timeoutMs must be a positive number");
    }
    if ("required" in backend && backend.required !== void 0) {
      assert(typeof backend.required === "boolean", "scan request.backend.required must be a boolean when present");
    }
  }
  return input;
}
function assertScanSnapshotInput(input) {
  assert(isRecord(input), "scan snapshot must be an object");
  assert(isNonEmptyString(input.id), "scan snapshot.id must be a non-empty string");
  assert(isNonEmptyString(input.origin), "scan snapshot.origin must be a non-empty string");
  assert(isNonEmptyString(input.url), "scan snapshot.url must be a non-empty string");
  assert(isEnumValue(input.engine, SCAN_ENGINES), "scan snapshot.engine must be dom-lite or crawl-lite");
  assert(isNonNegativeNumber(input.timestamp), "scan snapshot.timestamp must be a non-negative number");
  try {
    new URL(input.url);
  } catch {
    throw new Error("scan snapshot.url must be a valid URL");
  }
  const snapshotUrlOrigin = new URL(input.url).origin;
  if (input.origin === "null") {
    assert(snapshotUrlOrigin === "null", "scan snapshot.origin must match scan snapshot.url origin");
  } else {
    try {
      new URL(input.origin);
    } catch {
      throw new Error("scan snapshot.origin must be a valid URL");
    }
    assert(snapshotUrlOrigin === new URL(input.origin).origin, "scan snapshot.origin must match scan snapshot.url origin");
  }
  assert(Array.isArray(input.issues), "scan snapshot.issues must be an array");
  const issues = input.issues.map(assertIssue);
  assert(isRecord(input.summary), "scan snapshot.summary must be an object");
  assert(isNonNegativeNumber(input.summary.total), "scan snapshot.summary.total must be a non-negative number");
  const bySeverity = assertIssueCountsBySeverity(input.summary.bySeverity, "scan snapshot.summary.bySeverity");
  const byDomain = assertIssueCountsByDomain(input.summary.byDomain, "scan snapshot.summary.byDomain");
  assertSummaryMatchesIssues(
    {
      total: input.summary.total,
      bySeverity,
      byDomain
    },
    issues
  );
  return {
    id: input.id,
    origin: input.origin,
    url: input.url,
    timestamp: input.timestamp,
    engine: input.engine,
    issues,
    summary: {
      total: input.summary.total,
      bySeverity,
      byDomain
    }
  };
}
function assertDiffResultInput(input) {
  assert(isRecord(input), "diff result must be an object");
  assert(Array.isArray(input.newIssues), "diff result.newIssues must be an array");
  assert(Array.isArray(input.resolvedIssues), "diff result.resolvedIssues must be an array");
  assert(Array.isArray(input.regressions), "diff result.regressions must be an array");
  assert(Array.isArray(input.improvements), "diff result.improvements must be an array");
  return {
    newIssues: input.newIssues.map(assertIssue),
    resolvedIssues: input.resolvedIssues.map(assertIssue),
    regressions: input.regressions.map(assertIssue),
    improvements: input.improvements.map(assertIssue)
  };
}
function assertSummaryMatchesIssues(summary, issues) {
  const expected = summarizeIssues(issues);
  assert(summary.total === expected.total, `scan snapshot.summary.total must equal the issue count (${expected.total})`);
  for (const severity of SEVERITIES) {
    assert(
      summary.bySeverity[severity] === expected.bySeverity[severity],
      `scan snapshot.summary.bySeverity.${severity} must equal ${expected.bySeverity[severity]}`
    );
  }
  const expectedByDomain = expected.byDomain;
  for (const domain of Object.keys(expectedByDomain)) {
    const actualCount = summary.byDomain[domain] ?? 0;
    assert(
      actualCount === expectedByDomain[domain],
      `scan snapshot.summary.byDomain.${domain} must equal ${expectedByDomain[domain]}`
    );
  }
  for (const [domain, count] of Object.entries(summary.byDomain)) {
    assert(
      expectedByDomain[domain] !== void 0 || count === 0,
      `scan snapshot.summary.byDomain.${domain} must equal 0 when the domain is not present in the issue list`
    );
  }
}
function assertScanResultInput(input) {
  assert(isRecord(input), "scan result must be an object");
  assert(isNonEmptyString(input.requestId), "scan result.requestId must be a non-empty string");
  const snapshot = assertScanSnapshotInput(input.snapshot);
  const crawlNodes = "crawlNodes" in input && input.crawlNodes !== void 0 ? (assert(Array.isArray(input.crawlNodes), "scan result.crawlNodes must be an array when present"), input.crawlNodes.map(assertCrawlNode)) : void 0;
  const recommendation = "recommendation" in input && input.recommendation !== void 0 ? assertEngineRecommendation(input.recommendation) : void 0;
  return {
    requestId: input.requestId,
    snapshot,
    crawlNodes,
    recommendation
  };
}
function assertBackendScanResponseInput(input) {
  assert(isRecord(input), "backend response must be an object");
  const snapshot = assertScanSnapshotInput(input.snapshot);
  const crawlNodes = "crawlNodes" in input && input.crawlNodes !== void 0 ? (assert(Array.isArray(input.crawlNodes), "backend response.crawlNodes must be an array when present"), input.crawlNodes.map(assertCrawlNode)) : void 0;
  return {
    snapshot,
    crawlNodes
  };
}
function assertBackendRulesetCategoryEntry(input) {
  assert(isRecord(input), "ruleset category must be an object");
  assert(isEnumValue(input.category, [...DOMAINS, "performance", "accessibility", "ux", "drupal"]), "ruleset category must be supported");
  assert(Array.isArray(input.rules), "ruleset category.rules must be an array");
  const rules = input.rules.map((rule) => {
    assert(isRecord(rule), "ruleset rule must be an object");
    assert(isNonEmptyString(rule.id), "ruleset rule.id must be a non-empty string");
    assert(isNonEmptyString(rule.title), "ruleset rule.title must be a non-empty string");
    if ("enabled" in rule && rule.enabled !== void 0) {
      assert(typeof rule.enabled === "boolean", "ruleset rule.enabled must be a boolean when present");
    }
    assert(isEnumValue(rule.severity, SEVERITIES), "ruleset rule.severity must be valid");
    return {
      id: rule.id,
      title: rule.title,
      enabled: rule.enabled,
      severity: rule.severity
    };
  });
  if ("enabled" in input && input.enabled !== void 0) {
    assert(typeof input.enabled === "boolean", "ruleset category.enabled must be a boolean when present");
  }
  return {
    category: input.category,
    rules,
    enabled: input.enabled
  };
}
function assertBackendRulesetCategoryArray(input) {
  assert(Array.isArray(input) && input.length > 0, "ruleset category payload must be a non-empty array");
  return input.map(assertBackendRulesetCategoryEntry);
}
function assertAddonRulesetPayload(input) {
  assert(isRecord(input), "addon ruleset must be an object");
  assert(isNonEmptyString(input.version), "addon ruleset.version must be a non-empty string");
  assert(isNonEmptyString(input.generatedAt), "addon ruleset.generatedAt must be a non-empty string");
  const categories = assertBackendRulesetCategoryArray(input.categories);
  return {
    version: input.version,
    generatedAt: input.generatedAt,
    categories
  };
}
function assertKnowledgeBaseEntry(input) {
  assert(isRecord(input), "knowledge base entry must be an object");
  assert(isNonEmptyString(input.id), "knowledge base entry.id must be a non-empty string");
  assert(isNonEmptyString(input.title), "knowledge base entry.title must be a non-empty string");
  assert(isNonEmptyString(input.summary), "knowledge base entry.summary must be a non-empty string");
  assert(Array.isArray(input.notes), "knowledge base entry.notes must be an array");
  assert(input.notes.every((entry) => isNonEmptyString(entry)), "knowledge base entry.notes must contain non-empty strings");
  if ("enabled" in input && input.enabled !== void 0) {
    assert(typeof input.enabled === "boolean", "knowledge base entry.enabled must be a boolean when present");
  }
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    notes: input.notes,
    enabled: input.enabled
  };
}
function assertKnowledgeBaseCategory(input) {
  assert(isRecord(input), "knowledge base category must be an object");
  assert(isEnumValue(input.category, DOMAINS), "knowledge base category must be supported");
  assert(Array.isArray(input.entries), "knowledge base category.entries must be an array");
  if ("enabled" in input && input.enabled !== void 0) {
    assert(typeof input.enabled === "boolean", "knowledge base category.enabled must be a boolean when present");
  }
  return {
    category: input.category,
    enabled: input.enabled,
    entries: input.entries.map(assertKnowledgeBaseEntry)
  };
}
function assertKnowledgeBasePayload(input) {
  assert(isRecord(input), "knowledge base must be an object");
  assert(isNonEmptyString(input.version), "knowledge base.version must be a non-empty string");
  assert(isNonEmptyString(input.generatedAt), "knowledge base.generatedAt must be a non-empty string");
  assert(Array.isArray(input.categories) && input.categories.length > 0, "knowledge base.categories must be a non-empty array");
  return {
    version: input.version,
    generatedAt: input.generatedAt,
    categories: input.categories.map(assertKnowledgeBaseCategory)
  };
}
var issueSchema = createSchema(assertIssue);
var scanRequestSchema = createSchema(assertScanRequestInput);
var scanSnapshotSchema = createSchema(assertScanSnapshotInput);
var crawlNodeSchema = createSchema(assertCrawlNode);
var scanResultSchema = createSchema(assertScanResultInput);
var backendScanResponseSchema = createSchema(assertBackendScanResponseInput);
var diffResultSchema = createSchema(assertDiffResultInput);
var backendRulesetCategorySchema = createSchema(assertBackendRulesetCategoryArray);
var addonRulesetSchema = createSchema(assertAddonRulesetPayload);
var knowledgeBaseSchema = createSchema(assertKnowledgeBasePayload);
function summarizeIssues(issues) {
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const byDomain = {
    seo: 0,
    performance: 0,
    accessibility: 0,
    aeo: 0,
    ux: 0,
    drupal: 0,
    geo: 0,
    "security-headers": 0,
    "WCAG2.1AA": 0,
    "WCAG2.2AA": 0
  };
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byDomain[issue.domain] = (byDomain[issue.domain] ?? 0) + 1;
  }
  return {
    total: issues.length,
    bySeverity,
    byDomain
  };
}
function assertScanRequest(input) {
  return scanRequestSchema.parse(input);
}
function assertBackendScanResponse(input) {
  return backendScanResponseSchema.parse(input);
}

// src/shared/anti-bot.ts
function recommendEngine(request, context) {
  const score = scoreFromContext(context);
  if (request.engine === "dom-lite") {
    const engine2 = score >= 2 ? "http" : "mcp";
    const reason = engine2 === "http" ? "DOM-only scan plus moderate signals recommends lightweight HTTP backend path" : "Simple page profile is suitable for MCP-assisted checks";
    return {
      engine: engine2,
      reason,
      confidence: clamp01(score / 10)
    };
  }
  const fullScore = score + 5;
  const engine = pickEngine(fullScore);
  return {
    engine,
    reason: pickReason(engine, fullScore, context.links.length, context.images.length),
    confidence: clamp01(fullScore / 20)
  };
}
function pickEngine(score) {
  if (score >= 14) {
    return "mcp";
  }
  if (score >= 10) {
    return "stealth-playwright";
  }
  if (score >= 7) {
    return "fast-obscura";
  }
  return "http";
}
function pickReason(engine, score, linkCount, imageCount) {
  if (engine === "mcp") {
    return `High-complexity page surface (score ${score}, links ${linkCount}, images ${imageCount})`;
  }
  if (engine === "stealth-playwright") {
    return `Likely dynamic rendering; deeper headless capture recommended (score ${score})`;
  }
  if (engine === "fast-obscura") {
    return `Moderate link/image density suggests faster scraper path (score ${score})`;
  }
  return `Baseline crawl-lite profile stays on HTTP mode (score ${score})`;
}
function scoreFromContext(context) {
  let score = 0;
  if (context.links.length > 45) {
    score += 6;
  } else if (context.links.length > 25) {
    score += 4;
  } else if (context.links.length > 12) {
    score += 2;
  }
  if (!context.metaDescription) {
    score += 1;
  }
  if (!context.canonical) {
    score += 1;
  }
  if (!context.lang) {
    score += 1;
  }
  if (context.images.length > 20) {
    score += 3;
  } else if (context.images.length > 10) {
    score += 2;
  }
  if (context.headings.h3 > 8) {
    score += 1;
  }
  return score;
}
function clamp01(input) {
  if (input <= 0) {
    return 0;
  }
  if (input >= 1) {
    return 1;
  }
  return Math.round(input * 100) / 100;
}

// src/shared/rule-engine.ts
function deterministicHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16);
}
function createIssueId(ruleId, summary, evidence, selector = "") {
  const key = [ruleId, summary, evidence, selector].join("|").toLowerCase();
  return `iss-${deterministicHash(key)}`;
}
function createIssue(rule, summary, evidence, selector, source = "dom-only") {
  return {
    id: createIssueId(rule.id, summary, evidence, selector),
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    domain: rule.domain,
    summary,
    evidence,
    selector,
    source
  };
}
function runRules(rules, context) {
  const issues = rules.flatMap((rule) => rule.evaluate(context));
  const normalized = normalizeIssues(issues);
  let origin;
  try {
    origin = new URL(context.requestUrl).origin;
  } catch {
    throw new Error("rule context.requestUrl must be a valid URL");
  }
  return {
    issues: normalized,
    snapshot: {
      issues: normalized,
      origin,
      url: context.requestUrl,
      timestamp: Date.now(),
      engine: "dom-lite",
      summary: summarizeIssues(normalized)
    }
  };
}
function normalizeIssues(issues) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const issue of issues) {
    const key = [issue.ruleId, issue.evidence, issue.selector ?? ""].join("::").toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(issue);
  }
  return unique;
}
function diffSnapshots(current, previous) {
  const prevMap = new Map(previous?.issues.map((issue) => [issueIdentity(issue), issue]));
  const currMap = new Map(current.issues.map((issue) => [issueIdentity(issue), issue]));
  const newIssues = [];
  const resolvedIssues = [];
  const regressions = [];
  const improvements = [];
  if (!previous) {
    return { newIssues: current.issues, resolvedIssues, regressions, improvements };
  }
  for (const [id, issue] of currMap) {
    if (!prevMap.has(id)) {
      newIssues.push(issue);
      continue;
    }
    const previousIssue = prevMap.get(id);
    if (issue.severity !== previousIssue?.severity) {
      if (severityWorse(issue.severity, previousIssue?.severity ?? "low")) {
        regressions.push(issue);
      } else {
        improvements.push(issue);
      }
    }
  }
  for (const [id, issue] of prevMap) {
    if (!currMap.has(id)) {
      resolvedIssues.push(issue);
      improvements.push(issue);
    }
  }
  return { newIssues, resolvedIssues, regressions, improvements };
}
function issueIdentity(issue) {
  return [
    issue.ruleId,
    issue.title,
    issue.domain,
    issue.summary,
    issue.evidence,
    issue.selector ?? "",
    issue.source
  ].join("::").toLowerCase();
}
function severityWorse(current, previous) {
  const rank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  return rank[current] > rank[previous];
}

// src/shared/rules/accessibility-structure.ts
function buildEvidence(payload) {
  return JSON.stringify(payload);
}
function requiresAccessibleLabel(type) {
  return !["hidden", "button", "submit", "reset", "image"].includes(type.toLowerCase());
}
var wcag21HeadingStructure = {
  id: "wcag21-heading-structure",
  title: "Heading hierarchy should remain structural",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const issues = [];
    if (context.headings.h2 > 0 && context.headings.h1 === 0) {
      issues.push(
        createIssue(
          wcag21HeadingStructure,
          "Subordinate headings appear without a top-level heading",
          buildEvidence({
            finding: "missing-h1-before-h2",
            h1: context.headings.h1,
            h2: context.headings.h2,
            h3: context.headings.h3
          })
        )
      );
    }
    if (context.headings.h3 > 0 && context.headings.h2 === 0) {
      issues.push(
        createIssue(
          wcag21HeadingStructure,
          "H3 headings appear without an H2 structure",
          buildEvidence({
            finding: "missing-h2-before-h3",
            h1: context.headings.h1,
            h2: context.headings.h2,
            h3: context.headings.h3
          })
        )
      );
    }
    return issues;
  }
};
var wcag21LinkName = {
  id: "wcag21-link-name",
  title: "Links need discernible text",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.links.map((link, index) => ({ link, index })).filter(({ link }) => !link.text.trim()).map(
      ({ link, index }) => createIssue(
        wcag21LinkName,
        "Link has no discernible text",
        buildEvidence({
          finding: "missing-link-name",
          href: link.href,
          index,
          internal: link.isInternal,
          text: link.text
        })
      )
    );
  }
};
var wcag21FormLabel = {
  id: "wcag21-form-label",
  title: "Form controls need accessible labels",
  severity: "high",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.formInputs.map((field, index) => ({ field, index })).filter(({ field }) => requiresAccessibleLabel(field.type) && !field.labelText?.trim()).map(
      ({ field, index }) => createIssue(
        wcag21FormLabel,
        "Form control lacks a programmatic label",
        buildEvidence({
          finding: "missing-form-label",
          index,
          required: field.required,
          type: field.type,
          labelText: field.labelText
        })
      )
    );
  }
};
var wcagStructuralRules = [
  wcag21HeadingStructure,
  wcag21LinkName,
  wcag21FormLabel
];

// src/shared/rules/dom.ts
var seoTitleMissing = {
  id: "seo-title-missing",
  title: "Title tag missing",
  severity: "high",
  domain: "seo",
  evaluate: (context) => {
    if (context.title.trim()) {
      return [];
    }
    return [
      createIssue(
        seoTitleMissing,
        "Title element is missing or empty",
        `URL ${context.requestUrl} has empty document.title`
      )
    ];
  }
};
var seoTitleShort = {
  id: "seo-title-short",
  title: "Title too short",
  severity: "medium",
  domain: "seo",
  evaluate: (context) => {
    if (context.title.trim().length >= 25) {
      return [];
    }
    return [
      createIssue(
        seoTitleShort,
        "Title is under 25 characters",
        `Title text was: "${context.title}"`
      )
    ];
  }
};
var seoMetaDescriptionMissing = {
  id: "seo-missing-meta-description",
  title: "Meta description missing",
  severity: "medium",
  domain: "seo",
  evaluate: (context) => {
    if ((context.metaDescription ?? "").trim()) {
      return [];
    }
    return [
      createIssue(
        seoMetaDescriptionMissing,
        "Document is missing a meta description",
        `Meta description for ${context.requestUrl} is blank`
      )
    ];
  }
};
var seoHeadingStructure = {
  id: "seo-h1-required",
  title: "Page should have one H1",
  severity: "high",
  domain: "seo",
  evaluate: (context) => {
    if (context.headings.h1 === 1) {
      return [];
    }
    const severityText = context.headings.h1 === 0 ? "none" : "more than one";
    return [
      createIssue(
        seoHeadingStructure,
        `Page has ${severityText} H1 elements`,
        `Found ${context.headings.h1} H1 heading(s)`
      )
    ];
  }
};
var seoCanonicalConsistency = {
  id: "seo-canonical-consistency",
  title: "Canonical should match page origin",
  severity: "medium",
  domain: "seo",
  evaluate: (context) => {
    if (!context.canonical?.trim()) {
      return [];
    }
    try {
      const canonicalOrigin = new URL(context.canonical).origin;
      const pageOrigin = new URL(context.requestUrl).origin;
      if (canonicalOrigin === pageOrigin) {
        return [];
      }
      return [
        createIssue(
          seoCanonicalConsistency,
          "Canonical points to a different origin",
          `Canonical ${context.canonical} differs from page origin ${pageOrigin}`
        )
      ];
    } catch {
      return [];
    }
  }
};
var a11yImagesAlt = {
  id: "a11y-images-alt",
  title: "Image missing alt text",
  severity: "high",
  domain: "accessibility",
  evaluate: (context) => {
    return context.images.filter((img) => !img.alt || !img.alt.trim()).map(
      (img) => createIssue(
        a11yImagesAlt,
        "Decorative or meaningful image has missing alt",
        `Image missing alt: ${img.src}`
      )
    );
  }
};
var a11yLangAttribute = {
  id: "a11y-lang-attribute",
  title: "HTML lang missing",
  severity: "critical",
  domain: "accessibility",
  evaluate: (context) => {
    if (context.lang) {
      return [];
    }
    return [
      createIssue(
        a11yLangAttribute,
        "Root language is missing",
        "Top-level document has no lang attribute"
      )
    ];
  }
};
function getHeadingSequence(context) {
  return context.headingSequence ?? [];
}
function normalizeLinkLabel(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
function hasAccessibleLinkLabel(link) {
  return Boolean(link.text.trim() || link.ariaLabel?.trim() || link.title?.trim());
}
function hasAccessibleFormLabel(field) {
  return Boolean(field.labelText?.trim() || field.ariaLabel?.trim() || field.ariaLabelledBy?.trim() || field.title?.trim());
}
var a11yHeadingMissingH1 = {
  id: "wcag21-heading-structure",
  title: "Page should contain one H1",
  severity: "high",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const headings = getHeadingSequence(context);
    if (!headings.length || headings.some((heading) => heading.level === 1)) {
      return [];
    }
    return [
      createIssue(
        a11yHeadingMissingH1,
        "Page does not contain an H1 heading",
        "No heading in the extracted heading sequence uses level 1"
      )
    ];
  }
};
var a11yHeadingMultipleH1 = {
  id: "wcag21-heading-multiple-h1",
  title: "Page should not contain multiple H1s",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const headings = getHeadingSequence(context);
    const h1Count = headings.filter((heading) => heading.level === 1).length;
    if (h1Count <= 1) {
      return [];
    }
    return [
      createIssue(
        a11yHeadingMultipleH1,
        `Page contains ${h1Count} H1 headings`,
        `Heading sequence contains ${h1Count} level-one headings`
      )
    ];
  }
};
var a11yHeadingEmptyText = {
  id: "wcag21-heading-empty",
  title: "Heading text should not be empty",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const headings = getHeadingSequence(context);
    return headings.filter((heading) => !heading.text.trim()).map(
      (heading, index) => createIssue(
        a11yHeadingEmptyText,
        `Heading ${index + 1} is empty`,
        `Extracted ${headingLabel(heading.level)} with no text content`
      )
    );
  }
};
var a11yHeadingSkippedLevels = {
  id: "wcag21-heading-skipped-levels",
  title: "Heading levels should not skip levels",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const headings = getHeadingSequence(context).filter((heading) => heading.text.trim());
    if (headings.length < 2) {
      return [];
    }
    const issues = [];
    let previous = headings[0];
    for (let index = 1; index < headings.length; index += 1) {
      const current = headings[index];
      if (current.level - previous.level > 1) {
        issues.push(
          createIssue(
            a11yHeadingSkippedLevels,
            `Heading level skips from ${headingLabel(previous.level)} to ${headingLabel(current.level)}`,
            `Sequence jumped from ${headingLabel(previous.level)} to ${headingLabel(current.level)}`
          )
        );
      }
      previous = current;
    }
    return issues;
  }
};
var a11yLinkMissingLabel = {
  id: "wcag21-link-name",
  title: "Link needs accessible text",
  severity: "high",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.links.filter((link) => !hasAccessibleLinkLabel(link)).map(
      (link) => createIssue(
        a11yLinkMissingLabel,
        "Link has no accessible text",
        `Link target ${link.href} has no visible text, aria-label, or title`
      )
    );
  }
};
var a11yLinkVagueText = {
  id: "wcag21-link-vague-text",
  title: "Link text should be descriptive",
  severity: "low",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    const vagueLabels = /* @__PURE__ */ new Set(["click here", "read more", "here", "more", "link", "learn more"]);
    return context.links.filter((link) => {
      const text = normalizeLinkLabel(link.text);
      return text.length > 0 && vagueLabels.has(text) && !link.ariaLabel?.trim() && !link.title?.trim();
    }).map(
      (link) => createIssue(
        a11yLinkVagueText,
        "Link text is vague or non-descriptive",
        `Link text "${link.text}" does not describe its destination`
      )
    );
  }
};
var a11yLinkNonFunctional = {
  id: "wcag21-link-non-functional",
  title: "Link should point somewhere useful",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.links.filter((link) => link.href.endsWith("#")).map(
      (link) => createIssue(
        a11yLinkNonFunctional,
        "Link points to a non-functional fragment target",
        `Link href ${link.href} ends with a fragment-only target`
      )
    );
  }
};
var a11yFormMissingLabel = {
  id: "wcag21-form-label",
  title: "Form controls need labels",
  severity: "high",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.formInputs.filter((field) => !field.placeholder && !hasAccessibleFormLabel(field)).map(
      (field) => createIssue(
        a11yFormMissingLabel,
        "Form control has no accessible label",
        `Input type ${field.type} has no label, aria-label, aria-labelledby, or title`
      )
    );
  }
};
var a11yFormPlaceholderOnly = {
  id: "wcag21-form-placeholder-only",
  title: "Placeholder-only inputs need labels",
  severity: "medium",
  domain: "WCAG2.1AA",
  evaluate: (context) => {
    return context.formInputs.filter((field) => Boolean(field.placeholder?.trim()) && !hasAccessibleFormLabel(field)).map(
      (field) => createIssue(
        a11yFormPlaceholderOnly,
        "Form control relies on placeholder text only",
        `Input type ${field.type} uses placeholder "${field.placeholder}" instead of a real label`
      )
    );
  }
};
var uxButtonLabel = {
  id: "ux-button-label",
  title: "Buttons need accessible labels",
  severity: "medium",
  domain: "accessibility",
  evaluate: (context) => {
    return context.buttons.filter((btn) => !btn.text.trim() && !btn.ariaLabel?.trim() && !btn.title.trim()).map(
      () => createIssue(
        uxButtonLabel,
        "Button has no accessible label",
        `Button without text or aria-label on ${context.requestUrl}`
      )
    );
  }
};
var uxFormsRequiredLabel = {
  id: "ux-forms-required-label",
  title: "Required inputs require label",
  severity: "low",
  domain: "ux",
  evaluate: (context) => {
    return context.formInputs.filter((field) => field.required && !field.labelText).map(
      (field) => createIssue(
        uxFormsRequiredLabel,
        "Required form control missing label",
        `Input type ${field.type} is required but missing label text`
      )
    );
  }
};
var aeoAnswerSummary = {
  id: "aeo-answer-summary",
  title: "Answer summary missing",
  severity: "low",
  domain: "aeo",
  evaluate: (context) => {
    const normalizedTitle = context.title.trim();
    const looksLikeQuestion = /\?$/.test(normalizedTitle) || /^(how|what|why|when|where|who|which|can|should|does|do|is|are)\b/i.test(normalizedTitle);
    const answerSummary = (context.metaDescription ?? "").trim();
    if (!looksLikeQuestion || answerSummary.length >= 20) {
      return [];
    }
    return [
      createIssue(
        aeoAnswerSummary,
        "Question-style page lacks a concise answer summary",
        `Title "${context.title}" has no useful answer summary`
      )
    ];
  }
};
var aeoCanonicalLink = {
  id: "aeo-canonical-link",
  title: "Canonical link missing",
  severity: "low",
  domain: "aeo",
  evaluate: (context) => {
    if (context.canonical) {
      return [];
    }
    return [
      createIssue(aeoCanonicalLink, "No canonical link found", "Canonical URL not present in head")
    ];
  }
};
var domRules = [
  seoTitleMissing,
  seoTitleShort,
  seoMetaDescriptionMissing,
  seoHeadingStructure,
  seoCanonicalConsistency,
  a11yImagesAlt,
  a11yLangAttribute,
  a11yHeadingMissingH1,
  a11yHeadingMultipleH1,
  a11yHeadingEmptyText,
  a11yHeadingSkippedLevels,
  a11yLinkMissingLabel,
  a11yLinkVagueText,
  a11yLinkNonFunctional,
  a11yFormMissingLabel,
  a11yFormPlaceholderOnly,
  uxButtonLabel,
  uxFormsRequiredLabel,
  aeoAnswerSummary,
  aeoCanonicalLink,
  ...wcagStructuralRules
];
function headingLabel(level) {
  return `h${level}`;
}

// src/shared/rules/security-headers.ts
function getObservedSecurityHeaders(context) {
  const headers = context.securityHeaders;
  if (!headers?.observed) {
    return void 0;
  }
  return headers;
}
function buildEvidence2(headerName, details) {
  return `${headerName}: ${JSON.stringify(details)}`;
}
function hasUnsafeContentSecurityPolicy(policy) {
  return /'unsafe-inline'|'unsafe-eval'/i.test(policy);
}
function isUnsafeReferrerPolicy(policy) {
  const normalized = policy.trim().toLowerCase();
  return normalized === "unsafe-url" || normalized === "no-referrer-when-downgrade";
}
var securityHeaderCspMissing = {
  id: "security-header-csp-missing",
  title: "Content Security Policy missing",
  severity: "high",
  domain: "security-headers",
  evaluate: (context) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }
    if ((headers.contentSecurityPolicy ?? "").trim()) {
      return [];
    }
    return [
      createIssue(
        securityHeaderCspMissing,
        "No enforced Content-Security-Policy header was observed",
        buildEvidence2("Content-Security-Policy", {
          observed: headers.observed,
          value: headers.contentSecurityPolicy,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};
var securityHeaderCspUnsafeInline = {
  id: "security-header-csp-unsafe-inline",
  title: "Content Security Policy allows unsafe inline script execution",
  severity: "medium",
  domain: "security-headers",
  evaluate: (context) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }
    const policy = headers?.contentSecurityPolicy?.trim();
    if (!policy) {
      return [];
    }
    if (!hasUnsafeContentSecurityPolicy(policy)) {
      return [];
    }
    return [
      createIssue(
        securityHeaderCspUnsafeInline,
        "CSP allows unsafe inline or eval execution",
        buildEvidence2("Content-Security-Policy", {
          observed: headers.observed,
          value: policy,
          finding: "unsafe-inline-or-eval"
        })
      )
    ];
  }
};
var securityHeaderHstsMissing = {
  id: "security-header-hsts-missing",
  title: "Strict-Transport-Security missing",
  severity: "high",
  domain: "security-headers",
  evaluate: (context) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }
    if (new URL(context.requestUrl).protocol !== "https:") {
      return [];
    }
    if ((headers.strictTransportSecurity ?? "").trim()) {
      return [];
    }
    return [
      createIssue(
        securityHeaderHstsMissing,
        "No Strict-Transport-Security header was observed on an HTTPS page",
        buildEvidence2("Strict-Transport-Security", {
          observed: headers.observed,
          value: headers.strictTransportSecurity,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};
var securityHeaderReferrerPolicyMissing = {
  id: "security-header-referrer-policy-missing",
  title: "Referrer policy missing",
  severity: "low",
  domain: "security-headers",
  evaluate: (context) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }
    if ((headers.referrerPolicy ?? "").trim()) {
      return [];
    }
    return [
      createIssue(
        securityHeaderReferrerPolicyMissing,
        "No Referrer-Policy header was observed",
        buildEvidence2("Referrer-Policy", {
          observed: headers.observed,
          value: headers.referrerPolicy,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};
var securityHeaderReferrerPolicyUnsafe = {
  id: "security-header-referrer-policy-unsafe",
  title: "Referrer policy allows too much leakage",
  severity: "medium",
  domain: "security-headers",
  evaluate: (context) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }
    const policy = headers?.referrerPolicy?.trim();
    if (!policy) {
      return [];
    }
    if (!isUnsafeReferrerPolicy(policy)) {
      return [];
    }
    return [
      createIssue(
        securityHeaderReferrerPolicyUnsafe,
        "Referrer policy allows cross-site leakage",
        buildEvidence2("Referrer-Policy", {
          observed: headers.observed,
          value: policy,
          finding: "unsafe-referrer-policy"
        })
      )
    ];
  }
};
var securityHeaderRules = [
  securityHeaderCspMissing,
  securityHeaderCspUnsafeInline,
  securityHeaderHstsMissing,
  securityHeaderReferrerPolicyMissing,
  securityHeaderReferrerPolicyUnsafe
];

// src/shared/rules/registry.ts
var allRules = [...domRules, ...securityHeaderRules];

// src/shared/rulesets/default-rulesets.json
var default_rulesets_default = {
  version: "1.1.0",
  generatedAt: "2026-05-26T00:00:00Z",
  categories: [
    {
      category: "seo",
      enabled: true,
      rules: [
        {
          id: "seo-title-missing",
          title: "Title tag missing",
          severity: "high",
          enabled: true
        },
        {
          id: "seo-title-short",
          title: "Title too short",
          severity: "medium",
          enabled: true
        },
        {
          id: "seo-missing-meta-description",
          title: "Meta description missing",
          severity: "medium",
          enabled: true
        },
        {
          id: "seo-h1-required",
          title: "Heading structure mismatch",
          severity: "high",
          enabled: true
        },
        {
          id: "seo-canonical-consistency",
          title: "Canonical should match page origin",
          severity: "medium",
          enabled: true
        }
      ]
    },
    {
      category: "geo",
      enabled: false,
      rules: [
        {
          id: "geo-title-intent-mismatch",
          title: "Intent mismatch in title",
          severity: "low",
          enabled: false
        }
      ]
    },
    {
      category: "aeo",
      enabled: true,
      rules: [
        {
          id: "aeo-canonical-link",
          title: "Canonical link missing",
          severity: "low",
          enabled: true
        },
        {
          id: "aeo-answer-summary",
          title: "Answer summary missing",
          severity: "low",
          enabled: true
        }
      ]
    },
    {
      category: "security-headers",
      enabled: true,
      rules: [
        {
          id: "security-header-csp-missing",
          title: "Content Security Policy missing",
          severity: "high",
          enabled: true
        },
        {
          id: "security-header-csp-unsafe-inline",
          title: "Content Security Policy allows unsafe inline script execution",
          severity: "medium",
          enabled: true
        },
        {
          id: "security-header-hsts-missing",
          title: "Strict-Transport-Security missing",
          severity: "high",
          enabled: true
        },
        {
          id: "security-header-referrer-policy-missing",
          title: "Referrer policy missing",
          severity: "low",
          enabled: true
        },
        {
          id: "security-header-referrer-policy-unsafe",
          title: "Referrer policy allows too much leakage",
          severity: "medium",
          enabled: true
        }
      ]
    },
    {
      category: "WCAG2.1AA",
      enabled: true,
      rules: [
        {
          id: "wcag21-contrast-ratio",
          title: "Contrast ratio should meet WCAG 2.1 AA",
          severity: "medium",
          enabled: false
        },
        {
          id: "wcag21-focus-visible",
          title: "Focusable elements should be visibly focusable",
          severity: "low",
          enabled: false
        },
        {
          id: "wcag21-heading-structure",
          title: "Heading hierarchy should remain structural",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-heading-multiple-h1",
          title: "Page should not contain multiple H1s",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-heading-empty",
          title: "Heading text should not be empty",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-heading-skipped-levels",
          title: "Heading levels should not skip levels",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-link-name",
          title: "Links need discernible text",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-link-vague-text",
          title: "Link text should be descriptive",
          severity: "low",
          enabled: true
        },
        {
          id: "wcag21-link-non-functional",
          title: "Link should point somewhere useful",
          severity: "medium",
          enabled: true
        },
        {
          id: "wcag21-form-label",
          title: "Form controls need accessible labels",
          severity: "high",
          enabled: true
        },
        {
          id: "wcag21-form-placeholder-only",
          title: "Placeholder-only inputs need labels",
          severity: "medium",
          enabled: true
        }
      ]
    },
    {
      category: "WCAG2.2AA",
      enabled: false,
      rules: [
        {
          id: "wcag22-input-assistance",
          title: "Error prevention and input assistance checks",
          severity: "low",
          enabled: false
        }
      ]
    }
  ]
};

// src/shared/rulesets/catalog.ts
function loadEmbeddedCatalog() {
  return addonRulesetSchema.parse(default_rulesets_default);
}
function normalizeRuleSetIds(catalog) {
  return {
    ...catalog,
    categories: catalog.categories.map((category) => ({
      ...category,
      rules: category.rules.map((rule) => ({
        ...rule,
        severity: ["critical", "high", "medium", "low"].includes(rule.severity) ? rule.severity : "low",
        enabled: rule.enabled ?? true,
        title: rule.title.trim() || rule.id
      }))
    }))
  };
}
function filterEnabledRuleIds(catalog, categories) {
  if (!categories?.length) {
    return new Set(
      catalog.categories.flatMap(
        (category) => category.rules.filter((rule) => rule.enabled ?? true).map((rule) => rule.id)
      )
    );
  }
  const selected = /* @__PURE__ */ new Set();
  for (const category of catalog.categories) {
    if (!categories.includes(category.category)) {
      continue;
    }
    for (const rule of category.rules) {
      if (rule.enabled ?? true) {
        selected.add(rule.id);
      }
    }
  }
  return selected;
}

// src/background/orchestrator.ts
var ScanOrchestrator = class {
  constructor(deps = {}) {
    this.deps = deps;
    this.fetcher = deps.fetcher;
    this.securityHeaderFetcher = deps.securityHeaderFetcher;
    this.clock = deps.clock ?? (() => Date.now());
    this.backendClient = deps.backendClient;
  }
  fetcher;
  securityHeaderFetcher;
  clock;
  backendClient;
  async runScan(request, pageContext, previousSnapshot, rulesetCatalog) {
    const validated = assertScanRequest(request);
    const recommendation = recommendEngine(validated, pageContext);
    const effectiveRequest = this.enrichBackendRequest(validated, recommendation);
    const rules = this.selectRules(effectiveRequest, rulesetCatalog);
    const enrichedContext = await this.enrichSecurityHeaderContext(pageContext, validated.url);
    const localResult = runRules(rules, enrichedContext);
    const hybridStealthEscalation = this.shouldRunHybridStealthScan(effectiveRequest, enrichedContext);
    let snapshotIssues = [...localResult.snapshot.issues];
    let crawlNodes;
    if (this.shouldUseBackend(effectiveRequest)) {
      const backendRequest = hybridStealthEscalation ? this.withForcedBackendEngine(effectiveRequest, "stealth-playwright") : effectiveRequest;
      const backendResult = await this.runBackendScan(backendRequest, pageContext, rulesetCatalog);
      if (backendResult) {
        if (hybridStealthEscalation) {
          snapshotIssues = this.mergeIssues(localResult.snapshot.issues, backendResult.snapshot.issues);
        } else {
          snapshotIssues = [...backendResult.snapshot.issues];
        }
        crawlNodes = backendResult.crawlNodes;
      }
    }
    if (!crawlNodes) {
      crawlNodes = await this.runCrawl(validated, pageContext);
    } else if (!crawlNodes.length && validated.engine === "crawl-lite") {
      crawlNodes = await this.runCrawl(validated, pageContext);
    }
    const crawlIssues = buildCrawlIssues(crawlNodes, validated.url);
    const mergedIssues = [...snapshotIssues, ...crawlIssues];
    const resultSnapshot = {
      id: `scan-${this.clock()}`,
      origin: localResult.snapshot.origin,
      url: validated.url,
      timestamp: this.clock(),
      engine: validated.engine,
      issues: mergedIssues,
      summary: summarizeIssues(mergedIssues)
    };
    const diff = diffSnapshots(resultSnapshot, previousSnapshot);
    return {
      requestId: validated.requestId,
      snapshot: resultSnapshot,
      crawlNodes,
      recommendation,
      diff
    };
  }
  enrichBackendRequest(request, recommendation) {
    const requestWithCategories = this.enrichRuleCategoriesFromAccessibilityProfile(request);
    if (!requestWithCategories.backend || requestWithCategories.backend.enabled === false) {
      return requestWithCategories;
    }
    if (requestWithCategories.backend.mode === "stdin" || requestWithCategories.backend.mode === void 0) {
      return {
        ...requestWithCategories,
        backend: {
          ...requestWithCategories.backend,
          engine: requestWithCategories.backend.engine ?? recommendation.engine
        }
      };
    }
    return requestWithCategories;
  }
  enrichRuleCategoriesFromAccessibilityProfile(request) {
    if (request.ruleCategories?.length || !request.accessibilityProfile) {
      return request;
    }
    const categories = ["accessibility"];
    const profile = request.accessibilityProfile;
    if (profile.wcagLevel === "AA" || profile.wcagLevel === "AAA") {
      categories.push("WCAG2.1AA");
    }
    if (profile.wcagLevel === "AAA") {
      categories.push("WCAG2.2AA");
    }
    if (profile.includeBestPractices) {
      categories.push("ux");
    }
    return {
      ...request,
      ruleCategories: categories
    };
  }
  shouldUseBackend(request) {
    if (!request.backend) {
      return false;
    }
    return request.backend.enabled !== false;
  }
  shouldRunHybridStealthScan(request, context) {
    if (request.engine !== "dom-lite") {
      return false;
    }
    if (!request.backend || request.backend.enabled === false) {
      return false;
    }
    const linkHeavy = context.links.length >= 30;
    const imageHeavy = context.images.length >= 12;
    const headingHeavy = context.headings.h3 >= 10;
    const weakMetadata = !context.metaDescription || !context.canonical || !context.lang;
    return linkHeavy || imageHeavy || headingHeavy || weakMetadata;
  }
  withForcedBackendEngine(request, engine) {
    return {
      ...request,
      backend: {
        ...request.backend,
        enabled: true,
        engine
      }
    };
  }
  mergeIssues(localIssues, backendIssues) {
    const mergedIssues = [...localIssues];
    const seenKeys = new Set(localIssues.map((issue) => this.issueMergeKey(issue)));
    for (const issue of backendIssues) {
      const key = this.issueMergeKey(issue);
      if (seenKeys.has(key)) {
        continue;
      }
      mergedIssues.push(issue);
      seenKeys.add(key);
    }
    return mergedIssues;
  }
  issueMergeKey(issue) {
    return [issue.ruleId, issue.domain, issue.severity, issue.selector ?? "", issue.summary].join("|");
  }
  async enrichSecurityHeaderContext(pageContext, requestUrl) {
    if (pageContext.securityHeaders?.observed) {
      return pageContext;
    }
    const securityHeaders = await this.probeSecurityHeaders(requestUrl);
    if (!securityHeaders) {
      return pageContext;
    }
    return {
      ...pageContext,
      securityHeaders
    };
  }
  async probeSecurityHeaders(requestUrl) {
    if (!this.securityHeaderFetcher) {
      return void 0;
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(requestUrl);
    } catch {
      return void 0;
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return void 0;
    }
    try {
      const response = await this.securityHeaderFetcher(parsedUrl.toString(), {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store"
      });
      return {
        observed: true,
        contentSecurityPolicy: response.headers.get("content-security-policy"),
        strictTransportSecurity: response.headers.get("strict-transport-security"),
        referrerPolicy: response.headers.get("referrer-policy")
      };
    } catch {
      return {
        observed: false,
        contentSecurityPolicy: null,
        strictTransportSecurity: null,
        referrerPolicy: null
      };
    }
  }
  async runBackendScan(request, pageContext, rulesetCatalog) {
    if (!this.backendClient) {
      if (request.backend?.required) {
        throw new Error("Backend required but backend client is unavailable");
      }
      return void 0;
    }
    const payload = {
      request,
      pageContext,
      ruleSetVersion: rulesetCatalog?.version
    };
    if (request.ruleCategories) {
      payload.selectedCategories = request.ruleCategories;
    }
    try {
      return assertBackendScanResponse(await this.backendClient.runScan(payload));
    } catch (error) {
      if (request.backend?.required) {
        throw error;
      }
      return void 0;
    }
  }
  selectRules(request, rulesetCatalog) {
    const ruleIds = rulesetCatalog && request.ruleCategories?.length ? filterEnabledRuleIds(rulesetCatalog, request.ruleCategories) : void 0;
    if (!request.ruleCategories?.length) {
      return [...allRules];
    }
    if (!ruleIds?.size) {
      return allRules.filter((rule) => request.ruleCategories?.includes(rule.domain));
    }
    return allRules.filter((rule) => ruleIds.has(rule.id));
  }
  async runCrawl(request, pageContext) {
    if (request.engine !== "crawl-lite" || !pageContext.links.length) {
      return [];
    }
    const requestedDepth = request.crawlDepth ?? this.deps.crawlMaxDepth ?? 0;
    const crawlDepth = clamp(requestedDepth, 0, 2);
    if (!crawlDepth) {
      return [];
    }
    const configuredMax = request.crawlMaxUrls ?? this.deps.crawlMaxUrls ?? 0;
    const cap = this.deps.crawlMaxUrlLimit ?? 100;
    const limit = Math.min(configuredMax || 25, cap);
    if (!limit) {
      return [];
    }
    const seedUrl = new URL(request.url);
    const crawlQueue = normalizeAndDedupLinks(pageContext.links).filter((item) => item.isInternal).slice(0, limit).map((item) => ({
      url: normalizeForCrawl(item.href),
      depth: crawlDepth,
      status: "queued",
      discoveredFrom: request.url
    })).filter((item) => item.url);
    if (!crawlQueue.length) {
      return [];
    }
    if (!this.fetcher) {
      return crawlQueue.map((node) => ({
        ...node,
        status: "error",
        errorType: "blocked"
      }));
    }
    const results = [];
    for (const node of crawlQueue) {
      const safety = validateCrawlTarget(node.url, seedUrl.origin);
      if (!safety.ok) {
        results.push({
          ...node,
          status: "error",
          errorType: "blocked",
          note: safety.reason
        });
        continue;
      }
      const marker = {
        url: node.url,
        depth: node.depth,
        status: "running",
        discoveredFrom: node.discoveredFrom
      };
      try {
        const response = await withTimeout(
          this.fetcher(node.url, {
            method: "HEAD"
          }),
          this.deps.timeoutMs ?? 2e3
        );
        marker.statusCode = response.status;
        marker.finalUrl = response.url;
        const redirectCheck = response.url ? validateCrawlTarget(response.url, seedUrl.origin) : { ok: true };
        if (!redirectCheck.ok) {
          marker.status = "error";
          marker.errorType = "blocked";
          marker.note = redirectCheck.reason;
          results.push(marker);
          continue;
        }
        if (!response.ok) {
          marker.status = "error";
          marker.errorType = "other";
          marker.note = `HTTP ${response.status}`;
          results.push(marker);
          continue;
        }
        const contentType = typeof response.headers?.get === "function" ? response.headers.get("content-type") ?? "" : "";
        if (!contentType || !contentType.toLowerCase().includes("text/html")) {
          marker.status = "error";
          marker.errorType = "non_html";
          results.push(marker);
          continue;
        }
        marker.status = "done";
        results.push(marker);
      } catch (error) {
        marker.status = "error";
        marker.errorType = classifyError(error);
        results.push(marker);
      }
    }
    return results;
  }
};
function buildCrawlIssues(crawlNodes, scanUrl) {
  if (!crawlNodes?.length) {
    return [];
  }
  const sourceUrl = new URL(scanUrl);
  return crawlNodes.flatMap((node) => {
    const discoveredFrom = node.discoveredFrom ?? scanUrl;
    const evidence = node.finalUrl && node.finalUrl !== node.url ? `Crawl target ${node.url} redirected to ${node.finalUrl}` : `Crawl target ${node.url} discovered from ${discoveredFrom}`;
    if (node.status === "error") {
      if (node.statusCode && node.statusCode >= 400) {
        return [
          createIssue(
            {
              id: "crawl-broken-link",
              title: "Broken internal link discovered",
              severity: node.statusCode >= 500 ? "high" : "medium",
              domain: "seo"
            },
            `Crawl target returned HTTP ${node.statusCode}`,
            evidence,
            void 0,
            "backend"
          )
        ];
      }
      if (node.errorType === "cors" || node.errorType === "timeout" || node.errorType === "blocked") {
        return [
          createIssue(
            {
              id: `crawl-${node.errorType ?? "other"}-target`,
              title: "Crawl target could not be verified",
              severity: node.errorType === "timeout" ? "high" : "medium",
              domain: "seo"
            },
            `Crawl target ${node.errorType ?? "other"} during verification`,
            evidence,
            void 0,
            "backend"
          )
        ];
      }
      if (node.errorType === "non_html") {
        return [
          createIssue(
            {
              id: "crawl-non-html-target",
              title: "Crawl target is not HTML",
              severity: "low",
              domain: "seo"
            },
            "Crawl target returned a non-HTML document",
            evidence,
            void 0,
            "backend"
          )
        ];
      }
    }
    if (looksLikeDrupalEndpoint(node.url)) {
      return [
        createIssue(
          {
            id: "drupal-endpoint-exposed",
            title: "Drupal API endpoint exposed",
            severity: "low",
            domain: "drupal"
          },
          `Discovered Drupal-oriented endpoint at ${node.url}`,
          evidence,
          void 0,
          "backend"
        )
      ];
    }
    if (node.status === "done" && node.finalUrl && node.finalUrl !== node.url) {
      return [
        createIssue(
          {
            id: "crawl-redirect-observed",
            title: "Internal link redirected during crawl",
            severity: "low",
            domain: "seo"
          },
          `Crawl target redirected to ${node.finalUrl}`,
          evidence,
          void 0,
          "backend"
        )
      ];
    }
    if (node.status === "done" && sourceUrl.origin === new URL(node.url).origin && node.url !== scanUrl) {
      return [];
    }
    return [];
  });
}
function looksLikeDrupalEndpoint(url) {
  try {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return target.includes("/jsonapi") || target.includes("/rest") || target.includes("/graphql") || target.includes("/entity/");
  } catch {
    return false;
  }
}
function validateCrawlTarget(candidate, seedOrigin) {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, reason: `Blocked protocol ${url.protocol}` };
  }
  if (url.origin !== seedOrigin) {
    return { ok: false, reason: "Cross-origin target blocked by crawler policy" };
  }
  if (isPrivateOrRestrictedHost(url.hostname)) {
    return { ok: false, reason: "Potential SSRF/private host target blocked" };
  }
  return { ok: true };
}
function normalizeAndDedupLinks(links) {
  const seen = /* @__PURE__ */ new Set();
  return links.filter((link) => !isIgnored(link.href)).filter((link) => {
    const id = normalizeForCrawl(link.href);
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}
function isIgnored(url) {
  return !url;
}
function isPrivateOrRestrictedHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/\]$/, "").replace(/^\[/, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  if (normalized === "::1" || normalized.startsWith("fe80") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  const ipv4Match = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4Match) {
    return false;
  }
  const first = Number(ipv4Match[1]);
  const second = Number(ipv4Match[2]);
  const third = Number(ipv4Match[3]);
  if (first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return first === 100 && second >= 64 && second <= 127;
}
function classifyError(error) {
  if (error instanceof Error && error.name === "AbortError") {
    return "timeout";
  }
  const message = (error instanceof Error ? error.message : "").toLowerCase();
  if (message.includes("cors") || message.includes("cross-origin")) {
    return "cors";
  }
  if (message.includes("blocked")) {
    return "blocked";
  }
  return "other";
}
async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(Object.assign(new Error("Timed out"), { name: "AbortError" })), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
function normalizeForCrawl(input) {
  try {
    const url = new URL(input);
    url.hash = "";
    url.search = new URLSearchParams(url.searchParams).toString();
    return url.toString();
  } catch {
    return input;
  }
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/background/backend-bridge.ts
var DEFAULT_BACKEND_PATH = "/v1/audit/scan";
var DEFAULT_BACKEND_TIMEOUT_MS = 3500;
var MAX_STDIN_PAYLOAD_BYTES = 64 * 1024;
var DEFAULT_STDIN_TIMEOUT_MS = 3e3;
var HttpBackendClient = class {
  constructor(options) {
    this.options = options;
  }
  async runScan(payload) {
    const endpoint = trimEndpoint(this.options.endpoint);
    const requestBody = JSON.stringify(payload);
    const headers = {
      ...await buildSignedHeaders(this.options.requestSigningSecret, requestBody),
      ...buildBasicAuthHeader(this.options.auth)
    };
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...headers
      },
      body: requestBody
    };
    const controller = new AbortController();
    const timer = globalThis.setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS
    );
    try {
      const response = await fetch(`${endpoint}${backendPath(this.options.engine)}`, {
        ...request,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }
      return assertBackendScanResponse(await response.json());
    } finally {
      globalThis.clearTimeout(timer);
    }
  }
};
var StdinBackendClient = class {
  constructor(executor, timeoutMs = DEFAULT_STDIN_TIMEOUT_MS) {
    this.executor = executor;
    this.timeoutMs = timeoutMs;
  }
  async runScan(payload) {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_STDIN_PAYLOAD_BYTES) {
      throw new Error("Stdio backend payload exceeds 64KB limit");
    }
    const parsed = await withTimeout2(Promise.resolve(this.executor(payload)), this.timeoutMs, "Stdio backend timed out");
    return assertBackendScanResponse(parsed);
  }
};
function createBackendClient(request, selectedEngine) {
  if (!request || request.enabled === false) {
    return void 0;
  }
  if (!request.endpoint && request.mode !== "stdin") {
    return void 0;
  }
  if (request.mode === "stdin") {
    return void 0;
  }
  if (!request.endpoint) {
    return void 0;
  }
  return new HttpBackendClient({
    endpoint: request.endpoint,
    engine: selectedEngine || request.engine,
    requestSigningSecret: request.requestSigningSecret,
    auth: request.auth,
    timeoutMs: request.timeoutMs
  });
}
function createStdioBackendClient(request, executor, selectedEngine) {
  if (!request || request.enabled === false) {
    return void 0;
  }
  if (request.mode !== "stdin") {
    return void 0;
  }
  if (!executor) {
    return void 0;
  }
  return new StdinBackendClient((payload) => {
    const requestedEngine = selectedEngine ?? payload.request.backend?.engine;
    if (!requestedEngine) {
      return executor(payload);
    }
    return executor({
      ...payload,
      request: {
        ...payload.request,
        backend: {
          ...payload.request.backend,
          engine: requestedEngine
        }
      }
    });
  }, request.timeoutMs);
}
function createBackendAdapter(request, selectedEngine, stdioExecutor) {
  if (!request || request.enabled === false) {
    return void 0;
  }
  if (request.mode === "stdin") {
    return createStdioBackendClient(request, stdioExecutor, selectedEngine || request.engine);
  }
  return createBackendClient(request, selectedEngine);
}
function buildBasicAuthHeader(auth) {
  if (!auth?.username || !auth.password) {
    return {};
  }
  const encodedCredentials = globalThis.btoa?.(`${auth.username}:${auth.password}`);
  if (!encodedCredentials) {
    return {};
  }
  return {
    authorization: `Basic ${encodedCredentials}`
  };
}
async function buildSignedHeaders(secret, payload) {
  if (!secret) {
    return {};
  }
  const signature = await computeHmacSha256(secret, payload);
  return {
    "x-stlt-signature": signature
  };
}
async function computeHmacSha256(secret, message) {
  if (typeof globalThis.crypto?.subtle === "undefined" || typeof TextEncoder === "undefined") {
    return fallbackSignature(secret, message);
  }
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64FromBytes(new Uint8Array(signature));
}
function fallbackSignature(secret, message) {
  let acc = 0;
  const key = `${secret}:${message}`;
  for (let index = 0; index < key.length; index++) {
    acc = (acc + key.charCodeAt(index) * 31) % 2147483647;
  }
  return `fallback:${acc.toString(16)}`;
}
function base64FromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(binary, "binary").toString("base64");
  }
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function trimEndpoint(endpoint) {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}
function backendPath(engine) {
  if (!engine || engine === "http") {
    return DEFAULT_BACKEND_PATH;
  }
  return `${DEFAULT_BACKEND_PATH}/${engine}`;
}
function withTimeout2(promise, timeoutMs, message) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timedOut = new Error(message);
        timedOut.name = "TimeoutError";
        reject(timedOut);
      }, timeoutMs);
    })
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

// src/background/host-policy.ts
var LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isPrivateOrRestrictedHost2(hostname) {
  const normalized = normalizeHost(hostname);
  if (LOOPBACK_HOSTS.has(normalized) || normalized.endsWith(".localhost")) {
    return true;
  }
  if (normalized.includes(":") && /^fe[89ab]/.test(normalized)) {
    return true;
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  const ipv4 = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) {
    return false;
  }
  const first = Number(ipv4[1]);
  const second = Number(ipv4[2]);
  if (first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return first === 100 && second >= 64 && second <= 127;
}
function assertBackendEndpointAllowed(input) {
  const { endpoint, pageUrl, allowedHosts, allowLoopback = false } = input;
  const parsed = parseHostAndOrigin(endpoint);
  if (!parsed) {
    return { ok: false, reason: "Backend endpoint must be a valid absolute URL." };
  }
  const { host, protocol } = parsed;
  if (!["http:", "https:"].includes(protocol)) {
    return { ok: false, reason: "Backend endpoint must use http or https." };
  }
  if (!allowLoopback && isPrivateOrRestrictedHost2(host)) {
    return {
      ok: false,
      reason: "Backend endpoint targets local/private network and is blocked by host policy."
    };
  }
  const allowedHostset = new Set((allowedHosts ?? []).filter(Boolean).map((entry) => normalizeHost(entry)));
  let pageHost;
  if (!allowedHostset.size && pageUrl) {
    try {
      pageHost = normalizeHost(new URL(pageUrl).hostname);
    } catch {
      return {
        ok: false,
        reason: "Page URL must be a valid absolute URL."
      };
    }
    if (host !== pageHost && !(isLoopbackHost(host) && pageHost.startsWith("127."))) {
      return {
        ok: false,
        reason: "No backend allowlist provided and endpoint host does not match page host."
      };
    }
  }
  if (allowedHostset.size) {
    const allowed = [...allowedHostset].some((entry) => matchHost(entry, host));
    if (!allowed) {
      return {
        ok: false,
        reason: "Backend endpoint host is outside the configured backend allowed hosts."
      };
    }
  }
  if (protocol === "http:" && !isLoopbackHost(host)) {
    return {
      ok: false,
      reason: "Non-TLS backend endpoints are allowed only for loopback hosts."
    };
  }
  return { ok: true };
}
function parseHostAndOrigin(input) {
  try {
    const parsed = new URL(input);
    return {
      host: normalizeHost(parsed.hostname),
      protocol: parsed.protocol
    };
  } catch {
    return void 0;
  }
}
function normalizeHost(host) {
  return host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}
function isLoopbackHost(hostname) {
  const normalized = normalizeHost(hostname).replace(/^\*\./, "");
  return LOOPBACK_HOSTS.has(normalized) || normalized.endsWith(".localhost");
}
function matchHost(allowedEntry, host) {
  if (!allowedEntry) {
    return false;
  }
  if (allowedEntry === host) {
    return true;
  }
  if (!allowedEntry.startsWith("*.")) {
    return false;
  }
  const suffix = allowedEntry.slice(2);
  return host === suffix || host.endsWith(`.${suffix}`);
}
function sanitizeBackendHostPolicy(request) {
  return request?.allowedHosts?.map((entry) => parseAllowedHost(entry.trim())).filter((entry) => Boolean(entry));
}
function parseAllowedHost(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return void 0;
  }
  const hasWildcard = trimmed.startsWith("*.");
  const candidate = hasWildcard ? trimmed.slice(2).trim() : trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      return void 0;
    }
    return hasWildcard ? `*.${normalizeHost(parsed.hostname)}` : normalizeHost(parsed.hostname);
  } catch {
    return hasWildcard ? `*.${normalizeHost(candidate)}` : normalizeHost(candidate);
  }
}

// src/background/scan-history.ts
var DEFAULT_MAX_SNAPSHOTS_PER_ORIGIN = 20;
var ScanHistoryManager = class {
  constructor(storage2, config = {}) {
    this.storage = storage2;
    this.config = config;
  }
  async saveSnapshot(snapshot) {
    if (!snapshot.id || !snapshot.origin) {
      throw new Error("Snapshot must include id and origin");
    }
    const stored = await this.storage.loadSnapshots(snapshot.origin);
    const previousSnapshot = getLatestSnapshot(stored);
    const filtered = stored.filter((item) => item.id !== snapshot.id);
    const ranked = [snapshot, ...filtered].sort((left, right) => right.timestamp - left.timestamp);
    const maxPerOrigin = this.config.maxSnapshotsPerOrigin ?? DEFAULT_MAX_SNAPSHOTS_PER_ORIGIN;
    const trimmed = ranked.slice(0, Math.max(1, maxPerOrigin));
    await this.storage.saveSnapshots(snapshot.origin, trimmed);
    return {
      snapshot,
      previousSnapshot,
      diff: diffSnapshots(snapshot, previousSnapshot),
      totalStored: trimmed.length
    };
  }
  async listSnapshots(origin, limit) {
    const snapshots = await this.storage.loadSnapshots(origin);
    const normalized = [...snapshots].sort((left, right) => right.timestamp - left.timestamp);
    const max = typeof limit === "number" ? Math.max(1, limit) : normalized.length;
    return normalized.slice(0, max);
  }
  async getLatest(origin) {
    const snapshots = await this.listSnapshots(origin, 1);
    return snapshots[0];
  }
  async compareLatest(origin) {
    const [latest, previous] = await this.getTwoLatest(origin);
    if (!latest) {
      return { latest: void 0, previous: void 0, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } };
    }
    return {
      latest,
      previous,
      diff: diffSnapshots(latest, previous)
    };
  }
  async getTwoLatest(origin) {
    const snapshots = await this.listSnapshots(origin, 2);
    const latest = snapshots[0];
    return [latest, snapshots[1]];
  }
};
function getLatestSnapshot(snapshots) {
  if (!snapshots.length) {
    return void 0;
  }
  return [...snapshots].sort((left, right) => right.timestamp - left.timestamp)[0];
}
var MemoryHistoryStorage = class {
  buckets = /* @__PURE__ */ new Map();
  async loadSnapshots(origin) {
    return this.buckets.get(origin) ? [...this.buckets.get(origin)] : [];
  }
  async saveSnapshots(origin, snapshots) {
    this.buckets.set(origin, [...snapshots]);
  }
};

// src/background/storage.ts
var ChromeHistoryStorage = class {
  constructor(storage2) {
    this.storage = storage2;
  }
  async loadSnapshots(origin) {
    const key = keyForOrigin(origin);
    const payload = await this.storage.get([key]);
    return payload[key] ?? [];
  }
  async saveSnapshots(origin, snapshots) {
    const key = keyForOrigin(origin);
    await this.storage.set({ [key]: snapshots });
  }
};
function createChromeHistoryStorage(candidate) {
  const chromeStorage2 = candidate?.storage?.local;
  if (!chromeStorage2?.get || !chromeStorage2?.set) {
    return void 0;
  }
  return new ChromeHistoryStorage(chromeStorage2);
}
function keyForOrigin(origin) {
  return `scan_history_${origin.toLowerCase()}`;
}

// src/background/ruleset-catalog.ts
var RULESET_STORAGE_KEY = "addon_ruleset_catalog";
var RulesetCatalogManager = class {
  constructor(storage2) {
    this.storage = storage2;
    this.catalog = normalizeRuleSetIds(loadEmbeddedCatalog());
  }
  catalog;
  loadedPromise = null;
  async getCatalog() {
    if (!this.loadedPromise) {
      this.loadedPromise = this.loadOrCreateCatalog();
    }
    return this.loadedPromise;
  }
  async replaceCatalog(nextCatalog) {
    const normalized = normalizeRuleSetIds(nextCatalog);
    await this.storage.save(normalized);
    this.loadedPromise = Promise.resolve(normalized);
  }
  async updateCategory(category, updatedCategory) {
    const catalog = await this.getCatalog();
    const existing = catalog.categories.find((item) => item.category === category);
    if (!existing) {
      throw new Error(`Unknown ruleset category: ${category}`);
    }
    existing.rules = updatedCategory.rules ?? existing.rules;
    existing.enabled = updatedCategory.enabled ?? existing.enabled;
    await this.storage.save(catalog);
    this.loadedPromise = Promise.resolve(catalog);
  }
  async loadOrCreateCatalog() {
    const stored = await this.storage.load();
    if (!stored?.categories?.length) {
      await this.storage.save(this.catalog);
      return this.catalog;
    }
    try {
      const normalized = normalizeRuleSetIds(stored);
      return normalized;
    } catch {
      await this.storage.save(this.catalog);
      return this.catalog;
    }
  }
};
var MemoryRulesetCatalogStorage = class {
  catalog;
  async load() {
    return this.catalog;
  }
  async save(catalog) {
    this.catalog = catalog;
  }
};
var ChromeRulesetCatalogStorage = class {
  constructor(storage2) {
    this.storage = storage2;
  }
  async load() {
    const payload = await this.storage.get([RULESET_STORAGE_KEY]);
    return payload[RULESET_STORAGE_KEY];
  }
  async save(catalog) {
    await this.storage.set({ [RULESET_STORAGE_KEY]: catalog });
  }
};
function createRulesetCatalogStorage(candidate) {
  if (!candidate?.get || !candidate?.set) {
    return void 0;
  }
  return new ChromeRulesetCatalogStorage(candidate);
}

// src/shared/knowledge-base/default-knowledge-base.json
var default_knowledge_base_default = {
  version: "1.0.0",
  generatedAt: "2026-05-26T00:00:00Z",
  categories: [
    {
      category: "seo",
      enabled: true,
      entries: [
        {
          id: "seo-core-summary",
          title: "SEO core checks",
          summary: "Baseline SEO guidance for title, meta description, headings, and canonical consistency.",
          notes: [
            "Keep one descriptive title per page.",
            "Preserve canonical consistency across the crawl boundary.",
            "Keep canonical URLs aligned with the page origin."
          ],
          enabled: true
        }
      ]
    },
    {
      category: "geo",
      enabled: true,
      entries: [
        {
          id: "geo-core-summary",
          title: "GEO core checks",
          summary: "Generative engine optimization guidance for semantic structure and answerability.",
          notes: [
            "Prefer cohesive long-form answers over shallow sub-query pages.",
            "Keep answer sections machine-readable and model-friendly."
          ],
          enabled: true
        }
      ]
    },
    {
      category: "aeo",
      enabled: true,
      entries: [
        {
          id: "aeo-core-summary",
          title: "AEO core checks",
          summary: "Answer engine optimization guidance for direct answer content and concise answer summaries.",
          notes: [
            "Lead with concise answers and support with structured follow-up.",
            "Avoid content fragmentation that obscures the primary answer.",
            "Provide a concise answer summary when the page reads like a question."
          ],
          enabled: true
        }
      ]
    },
    {
      category: "security-headers",
      enabled: true,
      entries: [
        {
          id: "security-headers-core-summary",
          title: "Security header checks",
          summary: "Header hygiene guidance for browser-delivered content.",
          notes: [
            "Validate HSTS and CSP presence where applicable.",
            "Prefer explicit allowlists and restrictive defaults."
          ],
          enabled: true
        }
      ]
    },
    {
      category: "WCAG2.1AA",
      enabled: true,
      entries: [
        {
          id: "wcag21-core-summary",
          title: "WCAG 2.1 AA guidance",
          summary: "Accessibility guidance focused on operable, perceivable, and understandable UI patterns.",
          notes: [
            "Ensure keyboard reachability and visible focus states.",
            "Provide labels or equivalent accessible names for form and action controls."
          ],
          enabled: true
        }
      ]
    },
    {
      category: "WCAG2.2AA",
      enabled: true,
      entries: [
        {
          id: "wcag22-core-summary",
          title: "WCAG 2.2 AA guidance",
          summary: "Accessibility guidance for newer input assistance and error prevention requirements.",
          notes: [
            "Reduce interaction ambiguity and avoid hidden state changes.",
            "Expose correction and recovery guidance for destructive actions."
          ],
          enabled: true
        }
      ]
    }
  ]
};

// src/shared/knowledge-base/catalog.ts
function loadEmbeddedKnowledgeBase() {
  return knowledgeBaseSchema.parse(default_knowledge_base_default);
}
function normalizeKnowledgeBaseCatalog(catalog) {
  return {
    ...catalog,
    categories: catalog.categories.map((category) => ({
      ...category,
      entries: category.entries.map((entry) => ({
        ...entry,
        title: entry.title.trim() || entry.id,
        summary: entry.summary.trim(),
        notes: entry.notes.map((note) => note.trim()).filter(Boolean),
        enabled: entry.enabled ?? true
      }))
    }))
  };
}

// src/background/knowledge-base.ts
var KNOWLEDGE_BASE_STORAGE_KEY = "addon_knowledge_base_catalog";
var KnowledgeBaseManager = class {
  constructor(storage2) {
    this.storage = storage2;
  }
  loadedPromise = null;
  async getKnowledgeBase() {
    if (!this.loadedPromise) {
      this.loadedPromise = this.loadOrCreateKnowledgeBase();
    }
    return this.loadedPromise;
  }
  async replaceKnowledgeBase(nextCatalog) {
    const normalized = normalizeKnowledgeBaseCatalog(nextCatalog);
    await this.storage.save(normalized);
    this.loadedPromise = Promise.resolve(normalized);
  }
  async loadOrCreateKnowledgeBase() {
    const stored = await this.storage.load();
    if (!stored?.categories?.length) {
      const embedded = normalizeKnowledgeBaseCatalog(loadEmbeddedKnowledgeBase());
      await this.storage.save(embedded);
      return embedded;
    }
    try {
      return normalizeKnowledgeBaseCatalog(stored);
    } catch {
      const embedded = normalizeKnowledgeBaseCatalog(loadEmbeddedKnowledgeBase());
      await this.storage.save(embedded);
      return embedded;
    }
  }
};
var MemoryKnowledgeBaseStorage = class {
  catalog;
  async load() {
    return this.catalog;
  }
  async save(catalog) {
    this.catalog = catalog;
  }
};
var ChromeKnowledgeBaseStorage = class {
  constructor(storage2) {
    this.storage = storage2;
  }
  async load() {
    const payload = await this.storage.get([KNOWLEDGE_BASE_STORAGE_KEY]);
    return payload[KNOWLEDGE_BASE_STORAGE_KEY];
  }
  async save(catalog) {
    await this.storage.set({ [KNOWLEDGE_BASE_STORAGE_KEY]: catalog });
  }
};
function createKnowledgeBaseStorage(candidate) {
  if (!candidate?.get || !candidate?.set) {
    return void 0;
  }
  return new ChromeKnowledgeBaseStorage(candidate);
}

// src/ui/export.ts
function toJsonExport(bundle) {
  return JSON.stringify(bundle, null, 2);
}
function toHtmlExport(bundle) {
  const timestamp = new Date(bundle.snapshot.timestamp).toISOString();
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const domainRows = Object.entries(bundle.snapshot.summary.byDomain).filter(([, count]) => count > 0).map(
    ([domain, count]) => `<tr><td>${escapeHtml(domain)}</td><td>${count}</td><td>${renderDomainShare(
      count,
      bundle.snapshot.summary.total
    )}</td></tr>`
  ).join("\n");
  const issueRows = bundle.snapshot.issues.map(
    (issue) => `<tr>
  <td><span class="severity sev-${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span></td>
  <td>${escapeHtml(issue.domain)}</td>
  <td>${escapeHtml(issue.title)}</td>
  <td><code>${escapeHtml(issue.ruleId)}</code></td>
  <td>${escapeHtml(issue.summary)}</td>
  <td>${escapeHtml(issue.evidence)}</td>
</tr>`
  ).join("\n");
  const diffSection = bundle.diff ? `<section class="section">
    <h2>Diff</h2>
    <ul class="list">
      <li>New: ${bundle.diff.newIssues.length}</li>
      <li>Resolved: ${bundle.diff.resolvedIssues.length}</li>
      <li>Regressions: ${bundle.diff.regressions.length}</li>
      <li>Improvements: ${bundle.diff.improvements.length}</li>
    </ul>
  </section>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stealth Lightbeacon Executive Audit Report</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1020; --panel:rgba(255,255,255,0.06); --border:rgba(255,255,255,0.14); --text:#e8eefc; --muted:#9ba8c7; --accent:#77b7ff; --good:#4cd38a; --warn:#f4b860; --bad:#ff6b7a; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, "Segoe UI", system-ui, sans-serif; color:var(--text); background:linear-gradient(180deg,#090d17 0%,#0b1020 100%); }
    .shell { max-width:1200px; margin:0 auto; padding:24px 18px 40px; }
    .card { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:18px; margin-bottom:16px; }
    .eyebrow { margin:0 0 8px; text-transform:uppercase; letter-spacing:.12em; font-size:.78rem; color:var(--accent); font-weight:700; }
    h1,h2 { margin:0; line-height:1.2; }
    .muted { color:var(--muted); }
    .meta { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
    .chip { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:12px; padding:10px; }
    .chip span { color:var(--muted); font-size:.76rem; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:4px; }
    .score { font-size:2.2rem; font-weight:800; letter-spacing:-.04em; }
    .verdict { display:inline-block; border-radius:999px; padding:6px 11px; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
    .verdict.good { color:var(--good); border:1px solid rgba(76,211,138,.25); background:rgba(76,211,138,.1); }
    .verdict.warn { color:var(--warn); border:1px solid rgba(244,184,96,.25); background:rgba(244,184,96,.1); }
    .verdict.bad { color:var(--bad); border:1px solid rgba(255,107,122,.25); background:rgba(255,107,122,.1); }
    table { width:100%; border-collapse:collapse; table-layout:fixed; }
    th,td { padding:10px 12px; text-align:left; border-bottom:1px solid rgba(255,255,255,.1); vertical-align:top; overflow-wrap:anywhere; }
    th { text-transform:uppercase; letter-spacing:.08em; font-size:.72rem; color:var(--muted); background:rgba(255,255,255,.04); }
    .severity { display:inline-block; border-radius:999px; padding:4px 9px; font-size:.74rem; text-transform:uppercase; letter-spacing:.08em; font-weight:700; }
    .sev-critical { color:var(--bad); background:rgba(255,107,122,.1); border:1px solid rgba(255,107,122,.25); }
    .sev-high { color:var(--warn); background:rgba(244,184,96,.1); border:1px solid rgba(244,184,96,.25); }
    .sev-medium { color:#7db3ff; background:rgba(125,179,255,.1); border:1px solid rgba(125,179,255,.25); }
    .sev-low { color:var(--good); background:rgba(76,211,138,.1); border:1px solid rgba(76,211,138,.25); }
    .section { margin-top:12px; }
    .list { margin:10px 0 0; padding-left:20px; }
    @media (max-width: 900px) { .meta { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media print { body { background:#fff; color:#111; } .card,.chip { background:#fff; border-color:#333; } th,td { border-color:#555; color:#111; } .muted { color:#333; } }
  </style>
</head>
<body>
  <div class="shell">
    <section class="card">
      <p class="eyebrow">Executive Audit Report</p>
      <h1>Stealth Lightbeacon</h1>
      <p class="muted">Target URL: <code>${escapeHtml(bundle.snapshot.url)}</code></p>
      <div class="meta">
        <div class="chip"><span>Audit Score</span><strong>${score.toFixed(1)}/10</strong></div>
        <div class="chip"><span>Total Issues</span><strong>${bundle.snapshot.summary.total}</strong></div>
        <div class="chip"><span>Engine</span><strong>${escapeHtml(bundle.snapshot.engine)}</strong></div>
        <div class="chip"><span>Timestamp</span><strong>${escapeHtml(timestamp)}</strong></div>
      </div>
    </section>
    <section class="card">
      <h2>Executive Summary</h2>
      <p><span class="verdict ${verdict.css}">${verdict.label}</span></p>
      <p class="score">${score.toFixed(1)} <span class="muted">/ 10</span></p>
      <p class="muted">Critical: ${bundle.snapshot.summary.bySeverity.critical} | High: ${bundle.snapshot.summary.bySeverity.high} | Medium: ${bundle.snapshot.summary.bySeverity.medium} | Low: ${bundle.snapshot.summary.bySeverity.low}</p>
    </section>
    <section class="card section">
      <h2>Domain Distribution</h2>
      <table>
        <thead><tr><th>Domain</th><th>Issues</th><th>Share</th></tr></thead>
        <tbody>${domainRows || '<tr><td colspan="3">No issues detected.</td></tr>'}</tbody>
      </table>
    </section>
    <section class="card section">
      <h2>Issues</h2>
      <table>
        <thead><tr><th>Severity</th><th>Domain</th><th>Title</th><th>Rule</th><th>Summary</th><th>Evidence</th></tr></thead>
        <tbody>${issueRows || '<tr><td colspan="6">No issues detected.</td></tr>'}</tbody>
      </table>
    </section>
    ${diffSection}
  </div>
</body>
</html>`;
}
function toLlmMarkdownExport(bundle) {
  const lines = [
    "# Audit Findings",
    `URL: ${bundle.snapshot.url}`,
    `Generated: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    "",
    "## Prioritized Issue List",
    ...bundle.snapshot.issues.map((issue) => `- (${issue.severity}) ${issue.title} \u2014 ${issue.summary}`),
    ""
  ];
  if (bundle.diff) {
    lines.push("## Delta");
    lines.push(`new: ${bundle.diff.newIssues.length}`);
    lines.push(`resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`regressions: ${bundle.diff.regressions.length}`);
    lines.push(`improvements: ${bundle.diff.improvements.length}`);
    lines.push("");
  }
  return lines.join("\n");
}
function toGeoXmlExport(bundle) {
  const issues = bundle.snapshot.issues.map(
    (issue) => `    <issue id="${issue.id}" ruleId="${issue.ruleId}" severity="${issue.severity}" domain="${issue.domain}">
      <summary>${xmlEscape(issue.summary)}</summary>
      <evidence>${xmlEscape(issue.evidence)}</evidence>
    </issue>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<geoReport>
  <scan url="${xmlEscape(bundle.snapshot.url)}" engine="${bundle.snapshot.engine}" timestamp="${new Date(bundle.snapshot.timestamp).toISOString()}">
    <summary total="${bundle.snapshot.summary.total}" critical="${bundle.snapshot.summary.bySeverity.critical}" high="${bundle.snapshot.summary.bySeverity.high}" medium="${bundle.snapshot.summary.bySeverity.medium}" low="${bundle.snapshot.summary.bySeverity.low}" />
  </scan>
  <issues>
${issues}
  </issues>
</geoReport>`;
}
function xmlEscape(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function buildReport(bundle, format) {
  switch (format) {
    case "json":
      return toJsonExport(bundle);
    case "html":
      return toHtmlExport(bundle);
    case "llm-markdown":
      return toLlmMarkdownExport(bundle);
    case "geo-xml":
      return toGeoXmlExport(bundle);
    default:
      return toMarkdownExport(bundle);
  }
}
function toMarkdownExport(bundle) {
  const score = deriveScore(bundle.snapshot.summary.bySeverity);
  const verdict = scoreToVerdict(score);
  const lines = [
    `# Stealth Lightbeacon Executive Audit Report`,
    "",
    `## Scan Export`,
    `- URL: ${bundle.snapshot.url}`,
    `- Origin: ${bundle.snapshot.origin}`,
    `- Engine: ${bundle.snapshot.engine}`,
    `- Timestamp: ${new Date(bundle.snapshot.timestamp).toISOString()}`,
    `- Score: ${score.toFixed(1)}/10`,
    `- Verdict: ${verdict.label}`,
    "",
    `## Executive Summary`,
    `- Total issues: ${bundle.snapshot.summary.total}`,
    `- Critical: ${bundle.snapshot.summary.bySeverity.critical}`,
    `- High: ${bundle.snapshot.summary.bySeverity.high}`,
    `- Medium: ${bundle.snapshot.summary.bySeverity.medium}`,
    `- Low: ${bundle.snapshot.summary.bySeverity.low}`,
    ""
  ];
  lines.push("## Domain Distribution");
  lines.push("| Domain | Issues | Share |");
  lines.push("| --- | ---: | ---: |");
  for (const [domain, count] of Object.entries(bundle.snapshot.summary.byDomain).filter(([, count2]) => count2 > 0)) {
    lines.push(`| ${domain} | ${count} | ${renderDomainShare(count, bundle.snapshot.summary.total)} |`);
  }
  lines.push("");
  const byDomain = /* @__PURE__ */ new Map();
  for (const issue of bundle.snapshot.issues) {
    const bucket = byDomain.get(issue.domain) ?? [];
    bucket.push(`- [${issue.severity}] **${issue.title}**: ${issue.summary}`);
    byDomain.set(issue.domain, bucket);
  }
  for (const [domain, bulletPoints] of byDomain.entries()) {
    lines.push(`## ${domain}`);
    lines.push(...bulletPoints);
    lines.push("");
  }
  if (bundle.diff) {
    lines.push("## Diff");
    lines.push(`- New: ${bundle.diff.newIssues.length}`);
    lines.push(`- Resolved: ${bundle.diff.resolvedIssues.length}`);
    lines.push(`- Regressions: ${bundle.diff.regressions.length}`);
    lines.push(`- Improvements: ${bundle.diff.improvements.length}`);
  }
  return lines.join("\n");
}
function deriveScore(bySeverity) {
  const weighted = bySeverity.critical * 2.5 + bySeverity.high * 1.4 + bySeverity.medium * 0.7 + bySeverity.low * 0.2;
  const score = Math.max(0, Math.min(10, 10 - weighted));
  return Math.round(score * 10) / 10;
}
function scoreToVerdict(score) {
  if (score >= 8) {
    return { label: "Excellent", css: "good" };
  }
  if (score >= 6) {
    return { label: "Needs Attention", css: "warn" };
  }
  return { label: "High Risk", css: "bad" };
}
function renderDomainShare(count, total) {
  if (!total) {
    return "0.0%";
  }
  return `${(count / total * 100).toFixed(1)}%`;
}
function escapeHtml(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// src/shared/performance-trace.ts
var DEFAULT_WARN_THRESHOLD_MS = 16;
function startEventLoopTrace(label, sink = console, clock = globalThis.performance ?? { now: () => Date.now() }) {
  const startMark = `${label}:start`;
  const endMark = `${label}:end`;
  const startedAt = clock.now();
  clock.mark?.(startMark);
  return {
    end(details) {
      const durationMs = clock.now() - startedAt;
      clock.mark?.(endMark);
      clock.measure?.(label, startMark, endMark);
      const suffix = details ? ` ${details}` : "";
      const message = `[perf] ${label} ${durationMs.toFixed(2)}ms${suffix}`;
      sink.debug?.(message);
      if (durationMs >= DEFAULT_WARN_THRESHOLD_MS) {
        sink.warn?.(message);
      }
    }
  };
}
async function withEventLoopTrace(label, task, sink = console, clock = globalThis.performance ?? { now: () => Date.now() }) {
  const trace = startEventLoopTrace(label, sink, clock);
  try {
    return await Promise.resolve(task());
  } finally {
    trace.end();
  }
}

// src/background/toolbar-state.ts
var ACTION_ICON_PATHS = {
  normal: {
    16: "icons/icon-normal-16.png",
    32: "icons/icon-normal-32.png",
    48: "icons/icon-normal-48.png",
    64: "icons/icon-normal-64.png",
    128: "icons/icon-normal-128.png"
  },
  alert: {
    16: "icons/icon-alert-16.png",
    32: "icons/icon-alert-32.png",
    48: "icons/icon-alert-48.png",
    64: "icons/icon-alert-64.png",
    128: "icons/icon-alert-128.png"
  },
  fail: {
    16: "icons/icon-fail-16.png",
    32: "icons/icon-fail-32.png",
    48: "icons/icon-fail-48.png",
    64: "icons/icon-fail-64.png",
    128: "icons/icon-fail-128.png"
  }
};
var ACTION_ICON_PATHS_STATIC = {
  normal: {
    16: "icons/icon-normal-16-static.png",
    32: "icons/icon-normal-32-static.png",
    48: "icons/icon-normal-48-static.png",
    64: "icons/icon-normal-64-static.png",
    128: "icons/icon-normal-128-static.png"
  },
  alert: {
    16: "icons/icon-alert-16-static.png",
    32: "icons/icon-alert-32-static.png",
    48: "icons/icon-alert-48-static.png",
    64: "icons/icon-alert-64-static.png",
    128: "icons/icon-alert-128-static.png"
  },
  fail: {
    16: "icons/icon-fail-16-static.png",
    32: "icons/icon-fail-32-static.png",
    48: "icons/icon-fail-48-static.png",
    64: "icons/icon-fail-64-static.png",
    128: "icons/icon-fail-128-static.png"
  }
};
var BADGE_COLORS = {
  normal: "#0D47A1",
  alert: "#D49A17",
  fail: "#990000"
};
function resolveToolbarState(snapshot) {
  if (!snapshot || snapshot.summary.total <= 0) {
    return "normal";
  }
  if ((snapshot.summary.bySeverity.critical ?? 0) > 0 || (snapshot.summary.bySeverity.high ?? 0) > 0) {
    return "fail";
  }
  if ((snapshot.summary.bySeverity.medium ?? 0) > 0 || (snapshot.summary.bySeverity.low ?? 0) > 0) {
    return "alert";
  }
  return "normal";
}
function formatIssueCounter(totalIssues) {
  if (!totalIssues) {
    return "";
  }
  return totalIssues > 999 ? "999+" : String(totalIssues);
}
function actionApi(context) {
  return context.chrome?.action ?? context.chrome?.browserAction ?? context.browser?.action ?? context.browser?.browserAction;
}
async function applyToolbarState(context, tabId, snapshot) {
  const api = actionApi(context);
  if (!api) {
    return;
  }
  const toolbarState = resolveToolbarState(snapshot);
  const badgeText = formatIssueCounter(snapshot?.summary.total ?? 0);
  const iconPaths = ACTION_ICON_PATHS[toolbarState];
  try {
    await Promise.resolve(
      api.setIcon?.({
        tabId,
        path: iconPaths
      })
    );
  } catch {
    try {
      await Promise.resolve(
        api.setIcon?.({
          tabId,
          path: ACTION_ICON_PATHS_STATIC[toolbarState]
        })
      );
    } catch {
    }
  }
  try {
    await Promise.resolve(
      api.setBadgeText?.({
        tabId,
        text: badgeText
      })
    );
    await Promise.resolve(
      api.setBadgeBackgroundColor?.({
        tabId,
        color: BADGE_COLORS[toolbarState]
      })
    );
    await Promise.resolve(
      api.setBadgeTextColor?.({
        tabId,
        color: "#fff"
      })
    );
  } catch {
    return;
  }
}

// src/background/service-worker.ts
var globalRuntime = typeof globalThis === "undefined" ? {} : globalThis;
var SIDE_PANEL_CONTEXT_MENU_ID = "stealth-lightbeacon-open-side-panel";
var chromeStorage = createChromeHistoryStorage(resolveHistoryStorage(globalRuntime));
var storage = chromeStorage ?? new MemoryHistoryStorage();
var historyManager = new ScanHistoryManager(storage);
var rulesetStorage = createRulesetCatalogStorage(resolveHistoryStorage(globalRuntime)?.storage?.local);
var rulesetManager = new RulesetCatalogManager(rulesetStorage ?? new MemoryRulesetCatalogStorage());
var knowledgeBaseStorage = createKnowledgeBaseStorage(resolveHistoryStorage(globalRuntime)?.storage?.local);
var knowledgeBaseManager = new KnowledgeBaseManager(knowledgeBaseStorage ?? new MemoryKnowledgeBaseStorage());
async function handleMessage(message) {
  try {
    if (isScanStartMessage(message)) {
      return await withEventLoopTrace("service-worker.scan:start", async () => {
        const pageContext = message.pageContext ?? await resolvePageContextFromActiveTab(message.request.tabId);
        if (!pageContext) {
          return {
            ok: false,
            error: createFailure("Page context is missing; provide pageContext or request.tabId with active-tab permissions")
          };
        }
        const sanitizedBackendRequest = message.request.backend ? {
          ...message.request.backend,
          allowedHosts: sanitizeBackendHostPolicy(message.request.backend)
        } : void 0;
        const pageHost = new URL(pageContext.requestUrl).hostname;
        const loopbackBackendAllowList = sanitizedBackendRequest?.allowedHosts?.some(isLoopbackHost) ?? false;
        const backendRequest = applyBackendHostPolicy(
          sanitizedBackendRequest,
          pageContext.requestUrl,
          isLoopbackHost(pageHost) || loopbackBackendAllowList
        );
        const backendClient = createBackendAdapter(
          backendRequest,
          message.request.backend?.engine,
          message.request.backend?.mode === "stdin" ? resolveBackendStdioExecutor(globalRuntime) : void 0
        );
        const orchestrator = new ScanOrchestrator({
          backendClient,
          fetcher: globalRuntime.fetch,
          securityHeaderFetcher: globalRuntime.fetch
        });
        const previous = message.persistHistory ? await historyManager.getLatest(new URL(pageContext.requestUrl).origin) : void 0;
        const catalog = await rulesetManager.getCatalog();
        const requestUrl = resolveScanRequestUrl(message.request.url, pageContext.requestUrl);
        const result = await orchestrator.runScan(
          {
            ...message.request,
            url: requestUrl,
            backend: backendRequest
          },
          pageContext,
          previous,
          catalog
        );
        const tabId = message.request.tabId ?? await resolveActiveTabId(globalRuntime);
        await applyToolbarState(globalRuntime, tabId, result.snapshot);
        if (message.persistHistory) {
          await historyManager.saveSnapshot(result.snapshot);
        }
        return {
          ok: true,
          payload: {
            snapshot: result.snapshot,
            diff: result.diff,
            crawlNodes: result.crawlNodes,
            recommendation: result.recommendation
          }
        };
      });
    }
    if (message.type === "issues:list") {
      const issues = message.snapshot.issues.filter((issue) => {
        if (message.filter?.domain && issue.domain !== message.filter.domain) {
          return false;
        }
        if (message.filter?.severity && issue.severity !== message.filter.severity) {
          return false;
        }
        if (message.filter?.source && issue.source !== message.filter.source) {
          return false;
        }
        return true;
      });
      return { ok: true, payload: { issues, count: issues.length } };
    }
    if (message.type === "report:build") {
      return await withEventLoopTrace("service-worker.report:build", async () => ({
        ok: true,
        payload: {
          report: buildReport(
            {
              generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              snapshot: message.snapshot,
              diff: message.diff
            },
            message.format
          ),
          format: message.format
        }
      }));
    }
    if (message.type === "history:list") {
      const snapshots = await historyManager.listSnapshots(message.origin, message.limit);
      return { ok: true, payload: { snapshots } };
    }
    if (message.type === "history:latest") {
      const snapshot = await historyManager.getLatest(message.origin);
      return { ok: true, payload: { snapshot } };
    }
    if (message.type === "history:compare") {
      const compare = await historyManager.compareLatest(message.origin);
      return { ok: true, payload: compare };
    }
    if (message.type === "issue:highlight") {
      const tabId = message.tabId ?? await resolveActiveTabId(globalRuntime);
      if (typeof tabId !== "number") {
        return { ok: false, error: createFailure("No tab available for highlight action") };
      }
      const tabsApi = globalRuntime.chrome?.tabs ?? globalRuntime.browser?.tabs;
      await tabsApi?.sendMessage?.(tabId, {
        type: "issue:highlight",
        selector: message.selector
      });
      return { ok: true, payload: { tabId } };
    }
    if (message.type === "issue:clear-highlight") {
      const tabId = message.tabId ?? await resolveActiveTabId(globalRuntime);
      if (typeof tabId !== "number") {
        return { ok: false, error: createFailure("No tab available for clear highlight action") };
      }
      const tabsApi = globalRuntime.chrome?.tabs ?? globalRuntime.browser?.tabs;
      await tabsApi?.sendMessage?.(tabId, {
        type: "issue:clear-highlight"
      });
      return { ok: true, payload: { tabId } };
    }
    if (message.type === "ruleset:get") {
      const catalog = await rulesetManager.getCatalog();
      return { ok: true, payload: { catalog } };
    }
    if (message.type === "ruleset:update") {
      await rulesetManager.replaceCatalog(message.catalog);
      const catalog = await rulesetManager.getCatalog();
      return { ok: true, payload: { catalog } };
    }
    if (message.type === "knowledge-base:get") {
      const catalog = await knowledgeBaseManager.getKnowledgeBase();
      return { ok: true, payload: { catalog } };
    }
    if (message.type === "knowledge-base:update") {
      await knowledgeBaseManager.replaceKnowledgeBase(message.catalog);
      const catalog = await knowledgeBaseManager.getKnowledgeBase();
      return { ok: true, payload: { catalog } };
    }
    return { ok: false, error: createFailure("Unknown message type") };
  } catch (error) {
    return {
      ok: false,
      error: createFailure(error)
    };
  }
}
function startRuntimeListeners() {
  const runtime = globalRuntime.chrome?.runtime ?? globalRuntime.browser?.runtime ?? globalRuntime.runtime;
  if (!runtime?.onMessage?.addListener) {
    return;
  }
  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isKnownMessageType(message?.type)) {
      return false;
    }
    void handleMessage(message).then((response) => sendResponse(response)).catch((error) => sendResponse({ ok: false, error: createFailure(error) }));
    return true;
  });
}
function registerShellEntrypoints(context) {
  const host = context.chrome ?? context.browser;
  if (!host) {
    return;
  }
  host.action?.onClicked?.addListener(async (tab) => {
    const tabId = tab.id;
    if (typeof tabId === "number") {
      await host.sidePanel?.open?.({ tabId });
      return;
    }
    if (typeof tab.windowId === "number") {
      await host.sidePanel?.open?.({ windowId: tab.windowId });
    }
  });
  host.contextMenus?.create?.({
    id: SIDE_PANEL_CONTEXT_MENU_ID,
    title: "Open Stealth Lightbeacon",
    contexts: ["page"]
  });
  host.contextMenus?.onClicked?.addListener(async (info, tab) => {
    if (info.menuItemId !== SIDE_PANEL_CONTEXT_MENU_ID) {
      return;
    }
    if (typeof tab?.id === "number") {
      await host.sidePanel?.open?.({ tabId: tab.id });
    }
  });
}
function isKnownMessageType(type) {
  return type === "scan:start" || type === "history:list" || type === "history:latest" || type === "history:compare" || type === "issue:highlight" || type === "issue:clear-highlight" || type === "ruleset:get" || type === "ruleset:update" || type === "knowledge-base:get" || type === "knowledge-base:update" || type === "issues:list" || type === "report:build";
}
function resolveHistoryStorage(context) {
  const chromeStorageArea = context.chrome?.storage?.local;
  if (chromeStorageArea) {
    return { storage: { local: chromeStorageArea } };
  }
  const browserStorageArea = context.browser?.storage?.local;
  if (browserStorageArea) {
    return { storage: { local: browserStorageArea } };
  }
  return void 0;
}
async function resolvePageContextFromActiveTab(tabId) {
  const runtimeTabs = resolveRuntimeTabs(globalRuntime);
  if (!runtimeTabs) {
    return void 0;
  }
  let activeTabId = tabId;
  if (!activeTabId) {
    const active = await pickActiveTabId(runtimeTabs);
    activeTabId = active?.id;
  }
  if (!activeTabId) {
    return void 0;
  }
  try {
    await ensureContentScriptLoaded(runtimeTabs, activeTabId);
  } catch {
  }
  const response = await requestContentContext(runtimeTabs, activeTabId);
  if (isRuntimeMessageResponse(response)) {
    return response.payload;
  }
  return void 0;
}
async function resolveActiveTabId(context) {
  const runtimeTabs = resolveRuntimeTabs(context);
  if (!runtimeTabs) {
    return void 0;
  }
  const activeTab = await pickActiveTabId(runtimeTabs);
  return activeTab?.id;
}
async function pickActiveTabId(tabs) {
  if (!tabs.query) {
    return void 0;
  }
  const matches = await tabs.query({ active: true, currentWindow: true });
  return matches?.[0];
}
async function ensureContentScriptLoaded(tabs, tabId) {
  const scripting = globalRuntime.chrome?.scripting ?? globalRuntime.browser?.scripting;
  if (!scripting?.executeScript) {
    return;
  }
  await scripting.executeScript({
    target: {
      tabId
    },
    files: ["content-script.js"]
  });
}
async function requestContentContext(tabs, tabId) {
  if (!tabs.sendMessage) {
    return void 0;
  }
  try {
    return await tabs.sendMessage(tabId, { type: "content:extract" });
  } catch {
    return void 0;
  }
}
function resolveBackendStdioExecutor(context) {
  const candidate = context.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__;
  if (typeof candidate === "function") {
    return candidate;
  }
  return void 0;
}
function resolveRuntimeTabs(context) {
  const chromeTabs = context.chrome?.tabs;
  if (chromeTabs) {
    return chromeTabs;
  }
  const browserTabs = context.browser?.tabs;
  if (browserTabs) {
    return browserTabs;
  }
  return void 0;
}
function applyBackendHostPolicy(backend, pageUrl, allowLoopback = false) {
  if (!backend || backend.mode === "stdin" || !backend.endpoint) {
    return backend;
  }
  const check = assertBackendEndpointAllowed({
    endpoint: backend.endpoint,
    pageUrl,
    allowLoopback,
    allowedHosts: backend.allowedHosts
  });
  if (check.ok) {
    return backend;
  }
  if (backend.required) {
    throw new Error(check.reason ?? "Backend endpoint blocked by host policy");
  }
  return {
    ...backend,
    enabled: false
  };
}
function resolveScanRequestUrl(requestUrl, pageContextUrl) {
  const normalized = requestUrl?.trim();
  if (normalized) {
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
    }
  }
  return pageContextUrl;
}
function isRuntimeMessageResponse(input) {
  return !!input && typeof input === "object" && "ok" in input;
}
function registerRuntime() {
  startRuntimeListeners();
  registerShellEntrypoints(globalRuntime);
}
registerRuntime();
export {
  handleMessage,
  registerRuntime,
  startRuntimeListeners
};
