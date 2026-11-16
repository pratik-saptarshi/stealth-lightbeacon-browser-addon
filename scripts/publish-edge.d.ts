export function getEdgeAuthHeaders(env?: NodeJS.ProcessEnv): {
  authorization: string;
  'x-clientid': string;
};
export function pollOperation(
  operationUrl: string,
  headers: Record<string, string>,
  fetchImpl?: typeof fetch,
  timeoutMs?: number
): Promise<Record<string, unknown>>;
export function publishEdge(env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<void>;
