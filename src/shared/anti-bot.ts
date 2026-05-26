import type { BackendEngine, ScanRequest } from './types';
import type { RuleContext } from './rule-engine';

export interface EngineRecommendation {
  engine: BackendEngine;
  reason: string;
  confidence: number;
}

export function recommendEngine(request: ScanRequest, context: RuleContext): EngineRecommendation {
  const score = scoreFromContext(context);

  if (request.engine === 'dom-lite') {
    const engine: BackendEngine = score >= 2 ? 'http' : 'mcp';
    const reason =
      engine === 'http'
        ? 'DOM-only scan plus moderate signals recommends lightweight HTTP backend path'
        : 'Simple page profile is suitable for MCP-assisted checks';

    return {
      engine,
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

function pickEngine(score: number): BackendEngine {
  if (score >= 14) {
    return 'mcp';
  }

  if (score >= 10) {
    return 'stealth-playwright';
  }

  if (score >= 7) {
    return 'fast-obscura';
  }

  return 'http';
}

function pickReason(engine: BackendEngine, score: number, linkCount: number, imageCount: number): string {
  if (engine === 'mcp') {
    return `High-complexity page surface (score ${score}, links ${linkCount}, images ${imageCount})`;
  }

  if (engine === 'stealth-playwright') {
    return `Likely dynamic rendering; deeper headless capture recommended (score ${score})`;
  }

  if (engine === 'fast-obscura') {
    return `Moderate link/image density suggests faster scraper path (score ${score})`;
  }

  return `Baseline crawl-lite profile stays on HTTP mode (score ${score})`;
}

function scoreFromContext(context: RuleContext): number {
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

function clamp01(input: number): number {
  if (input <= 0) {
    return 0;
  }

  if (input >= 1) {
    return 1;
  }

  return Math.round(input * 100) / 100;
}
