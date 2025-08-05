/**
 * LocalStack plugin types
 */

export interface LocalStackConfig {
  autoStart?: boolean;
  environment?: Record<string, string>;
  waitForReady?: {
    maxAttempts?: number;
    retryDelayMs?: number;
  };
  stopOnCleanup?: boolean;
  debug?: boolean;
  hotReloading?: {
    enabled?: boolean;
    watchInterval?: number; // ms
    lambdaPaths?: Array<{
      functionName: string;
      localPath: string;
      handler: string;
      runtime: string;
      fileExtensions?: string[]; // Optional: override default extensions for this Lambda
    }>;
    // Runtime configuration - can be extended without code changes
    runtimeFileExtensions?: Record<string, string[]>;
    // Default extensions when runtime is unknown or not configured
    defaultFileExtensions?: string[];
  };
}

export interface LocalStackHealthResponse {
  services?: Record<string, unknown>;
  features?: Record<string, unknown>;
  version?: string;
}

export interface LocalStackStatus {
  running: boolean;
  output: string;
}