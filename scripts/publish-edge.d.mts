export function getEdgeAccessToken(env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<string>;
export function pollOperation(
  operationUrl: string,
  headers: Record<string, string>,
  fetchImpl?: typeof fetch,
  timeoutMs?: number
): Promise<Record<string, unknown>>;
export function publishEdge(env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<void>;
