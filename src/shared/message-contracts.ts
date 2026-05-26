import type {
  CrawlNode,
  DiffResult,
  ScanSnapshot,
  ScanRequest,
  EngineRecommendation,
  Issue,
  RuleDomain,
  Severity,
  IssueSource
} from './types';
import type { RuleContext } from './rule-engine';
import type { AddonRulesCatalog } from './rulesets/catalog';

export interface ScanStartMessage {
  type: 'scan:start';
  request: ScanRequest;
  pageContext?: RuleContext;
  persistHistory?: boolean;
}

export interface RulesetGetMessage {
  type: 'ruleset:get';
}

export interface RulesetUpdateMessage {
  type: 'ruleset:update';
  catalog: AddonRulesCatalog;
}

export interface IssueListMessage {
  type: 'issues:list';
  snapshot: ScanSnapshot;
  filter?: {
    domain?: RuleDomain;
    severity?: Severity;
    source?: IssueSource;
  };
}

export interface ReportBuildMessage {
  type: 'report:build';
  snapshot: ScanSnapshot;
  diff?: DiffResult;
  format: 'json' | 'markdown' | 'html' | 'llm-markdown' | 'geo-xml';
}

export interface HistoryListMessage {
  type: 'history:list';
  origin: string;
  limit?: number;
}

export interface HistoryLatestMessage {
  type: 'history:latest';
  origin: string;
}

export interface HistoryCompareMessage {
  type: 'history:compare';
  origin: string;
}

export type ClientMessage =
  | ScanStartMessage
  | HistoryListMessage
  | HistoryLatestMessage
  | HistoryCompareMessage
  | RulesetGetMessage
  | RulesetUpdateMessage
  | IssueListMessage
  | ReportBuildMessage;

export interface ScanStartResult {
  snapshot: ScanSnapshot;
  diff: DiffResult;
  crawlNodes?: CrawlNode[];
  recommendation?: EngineRecommendation;
}

export interface IssueListResult {
  issues: Issue[];
  count: number;
}

export interface ReportBuildResult {
  report: string;
  format: 'json' | 'markdown' | 'html' | 'llm-markdown' | 'geo-xml';
}

export interface HistoryListResult {
  snapshots: ScanSnapshot[];
}

export interface HistoryLatestResult {
  snapshot?: ScanSnapshot;
}

export interface HistoryCompareResult {
  latest?: ScanSnapshot;
  previous?: ScanSnapshot;
  diff: DiffResult;
}

export interface RulesetResponse {
  catalog: AddonRulesCatalog;
}

export interface ScanStartResponse {
  ok: true;
  payload: ScanStartResult;
}

export interface ScanFailure {
  ok: false;
  error: string;
}

export type ScanStartReply = ScanStartResponse | ScanFailure;
export type IssueListReply = { ok: true; payload: IssueListResult } | ScanFailure;
export type ReportBuildReply = { ok: true; payload: ReportBuildResult } | ScanFailure;
export type HistoryListReply = { ok: true; payload: HistoryListResult } | ScanFailure;
export type HistoryLatestReply = { ok: true; payload: HistoryLatestResult } | ScanFailure;
export type HistoryCompareReply = { ok: true; payload: HistoryCompareResult } | ScanFailure;
export type RulesetGetReply = { ok: true; payload: RulesetResponse } | ScanFailure;
export type RulesetUpdateReply = { ok: true; payload: RulesetResponse } | ScanFailure;

export type MessageResponseByType = {
  'scan:start': ScanStartReply;
  'history:list': HistoryListReply;
  'history:latest': HistoryLatestReply;
  'history:compare': HistoryCompareReply;
  'ruleset:get': RulesetGetReply;
  'ruleset:update': RulesetUpdateReply;
  'issues:list': IssueListReply;
  'report:build': ReportBuildReply;
};

export function isScanStartMessage(input: unknown): input is ScanStartMessage {
  return !!input && typeof input === 'object' && (input as Record<string, unknown>).type === 'scan:start';
}

export function createFailure(error: unknown) {
  return `Scan failed: ${String(error)}`;
}
