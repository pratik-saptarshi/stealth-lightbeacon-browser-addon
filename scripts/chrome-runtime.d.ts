export interface ChromeLaunchOverrides {
  executablePath?: string;
  channel?: string;
}

export interface ChromeLaunchStrategy {
  primary: ChromeLaunchOverrides;
  fallback: ChromeLaunchOverrides;
}

export interface PickChromeLaunchStrategyOptions {
  env?: Record<string, string | undefined>;
  fileExists?: (filePath: string) => boolean;
  canExecute?: (command: string) => boolean;
}

export function pickChromeLaunchStrategy(options?: PickChromeLaunchStrategyOptions): ChromeLaunchStrategy;
