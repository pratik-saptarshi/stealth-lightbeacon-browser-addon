import type { CrawlNode, ScanRequest, ScanSnapshot } from '../shared/types';
import type { RuleContext } from '../shared/rule-engine';
import { scanSnapshotSchema } from '../shared/contracts';

export interface BackendScanResponse {
  snapshot: ScanSnapshot;
  crawlNodes?: CrawlNode[];
}

export interface BackendPayload {
  request: ScanRequest;
  pageContext: RuleContext;
  ruleSetVersion?: string;
  selectedCategories?: string[];
}

export interface BackendConfig {
  enabled?: boolean;
  mode?: 'http' | 'stdin';
  endpoint?: string;
  auth?: {
    username: string;
    password: string;
  };
  timeoutMs?: number;
  required?: boolean;
}

export interface BackendAdapter {
  runScan(payload: BackendPayload): Promise<BackendScanResponse>;
}

interface HttpBackendOptions {
  endpoint: string;
  auth?: {
    username: string;
    password: string;
  };
  timeoutMs?: number;
}

const DEFAULT_BACKEND_PATH = '/v1/audit/scan';
const DEFAULT_BACKEND_TIMEOUT_MS = 3500;

export class HttpBackendClient implements BackendAdapter {
  constructor(private readonly options: HttpBackendOptions) {}

  async runScan(payload: BackendPayload): Promise<BackendScanResponse> {
    const endpoint = trimEndpoint(this.options.endpoint);
    const request: RequestInit = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...buildBasicAuthHeader(this.options.auth)
      },
      body: JSON.stringify(payload)
    };

    const controller = new AbortController();
    const timer = globalThis.setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${endpoint}${DEFAULT_BACKEND_PATH}`, {
        ...request,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }

      const parsed = (await response.json()) as { snapshot?: unknown; crawlNodes?: CrawlNode[] };
      const snapshot = scanSnapshotSchema.parse(parsed.snapshot);
      return {
        snapshot,
        crawlNodes: parsed.crawlNodes
      };
    } finally {
      globalThis.clearTimeout(timer);
    }
  }
}

export class StdinBackendClient implements BackendAdapter {
  constructor(private readonly executor: (payload: BackendPayload) => Promise<unknown>) {}

  async runScan(payload: BackendPayload): Promise<BackendScanResponse> {
    const parsed = await this.executor(payload);
    const container = parsed as { snapshot?: unknown; crawlNodes?: CrawlNode[] };
    const snapshot = scanSnapshotSchema.parse(container.snapshot);
    return {
      snapshot,
      crawlNodes: container.crawlNodes
    };
  }
}

export function createBackendClient(request: ScanRequest['backend']): BackendAdapter | undefined {
  if (!request || request.enabled === false) {
    return undefined;
  }

  if (!request.endpoint && request.mode !== 'stdin') {
    return undefined;
  }

  if (request.mode === 'stdin') {
    return undefined;
  }

  if (!request.endpoint) {
    return undefined;
  }

  return new HttpBackendClient({
    endpoint: request.endpoint,
    auth: request.auth,
    timeoutMs: request.timeoutMs
  });
}

export function createStdioBackendClient(
  request: ScanRequest['backend'],
  executor: ((payload: BackendPayload) => Promise<unknown>) | undefined
): BackendAdapter | undefined {
  if (!request || request.enabled === false) {
    return undefined;
  }

  if (request.mode !== 'stdin') {
    return undefined;
  }

  if (!executor) {
    return undefined;
  }

  return new StdinBackendClient(executor);
}

function buildBasicAuthHeader(auth?: BackendConfig['auth']): Record<string, string> {
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

function trimEndpoint(endpoint: string): string {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}
