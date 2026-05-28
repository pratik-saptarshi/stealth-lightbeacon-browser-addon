export const SMOKE_FIXTURE_RELATIVE_PATH: string;
export const SMOKE_VIEWPORTS: ReadonlyArray<Readonly<{ width: number; height: number }>>;

export function isExternalSmokeRequest(rawUrl: string): boolean;
export function assertNoExternalSmokeRequests(requestUrls: string[], label?: string): void;
