/* eslint-disable no-console */
import type { Plugin, PluginConfig, OrcdkConfig, CommandInfo } from '@orcdkestrator/core';
import { EventBus, EventTypes } from '@orcdkestrator/core';
import * as path from 'path';
import { LocalStackCLI } from './cli';
import { LocalStackConfig } from './types';
import { HotReloadWatcher } from './hot-reload';
import { expandEnvironmentVariables } from './utils';

/**
 * LocalStack plugin for local AWS development
 * Manages LocalStack lifecycle using the LocalStack CLI
 * 
 * @example
 * ```json
 * {
 *   "name": "localstack",
 *   "enabled": true,
 *   "config": {
 *     "autoStart": true,
 *     "environment": {
 *       "DEBUG": "1",
 *       "PERSISTENCE": "1",
 *       "GATEWAY_LISTEN": "0.0.0.0:4566"
 *     },
 *     "waitForReady": {
 *       "maxAttempts": 60,
 *       "retryDelayMs": 1000
 *     },
 *     "stopOnCleanup": false,
 *     "debug": true,
 *     "hotReloading": {
 *       "enabled": true,
 *       "watchInterval": 700,
 *       "lambdaPaths": [
 *         {
 *           "functionName": "my-function",
 *           "localPath": "/absolute/path/to/lambda/code",
 *           "handler": "handler.function",
 *           "runtime": "python3.8"
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 * 
 * Configuration options:
 * - autoStart: Whether to automatically start LocalStack if not running (default: true)
 * - environment: Environment variables to pass to LocalStack
 * - waitForReady: Configuration for health check waiting
 * - stopOnCleanup: Whether to stop LocalStack when deployment finishes
 * - debug: Enable debug logging
 * - hotReloading: Configuration for Lambda hot reloading
 */
export class LocalStackPlugin implements Plugin {
  public readonly name = '@orcdkestrator/orcdk-plugin-localstack';
  public readonly version = '1.0.0';
  
  private cli: LocalStackCLI | null = null;
  private config: PluginConfig | null = null;
  private orcdkConfig: OrcdkConfig | null = null;
  private eventBus: EventBus | null = null;
  private hotReloadWatcher: HotReloadWatcher | null = null;
  
  async initialize(config: PluginConfig, orcdkConfig: OrcdkConfig): Promise<void> {
    this.config = config;
    this.orcdkConfig = orcdkConfig;
    this.cli = new LocalStackCLI();
    
    // Initialize hot reload watcher if enabled
    const localStackConfig = this.config?.config as LocalStackConfig;
    if (localStackConfig?.hotReloading?.enabled) {
      this.hotReloadWatcher = new HotReloadWatcher(localStackConfig);
    }
    
    // Subscribe to events
    this.eventBus = EventBus.getInstance();
    this.subscribeToEvents();
  }
  
  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    if (!this.eventBus) return;
    
    // Listen for pattern detection event to start LocalStack
    this.eventBus.on(EventTypes['orchestrator:before:pattern-detection'], async () => {
      if (!this.shouldRun()) return;
      
      const config = this.config?.config as LocalStackConfig;
      const autoStart = config?.autoStart !== false; // Default to true
      
      if (autoStart) {
        await this.ensureNotRunning();
        await this.checkDependencies();
        await this.startLocalStack();
      } else {
        // When autoStart is false, only check if LocalStack is healthy
        await this.ensureRunning();
      }
    });
  }
  
  private shouldRun(): boolean {
    const env = process.env.CDK_ENVIRONMENT;
    const envConfig = this.orcdkConfig?.environments[env || ''];
    const shouldRun = !!(envConfig?.isLocal && this.config?.enabled);
    this.debug(`shouldRun: ${shouldRun} (env: ${env}, isLocal: ${envConfig?.isLocal}, enabled: ${this.config?.enabled})`);
    return shouldRun;
  }
  
  private async ensureNotRunning(): Promise<void> {
    const port = this.getPort();
    this.debug(`Checking if LocalStack is already running on port ${port}`);
    if (await this.cli!.isHealthy(port)) {
      this.exitWithError(
        `LocalStack is already running on port ${port}.\n` +
        'To stop the existing instance, run: localstack stop\n' +
        'Or configure a different port using GATEWAY_LISTEN environment variable.'
      );
    }
    this.debug('LocalStack is not running');
  }
  
  private async ensureRunning(): Promise<void> {
    const port = this.getPort();
    this.debug(`Checking if LocalStack is running on port ${port} (autoStart disabled)`);
    if (!(await this.cli!.isHealthy(port))) {
      this.exitWithError(
        `LocalStack is not running on port ${port}.\n` +
        'Since autoStart is disabled, you need to start LocalStack manually:\n' +
        '  localstack start\n' +
        'Or enable autoStart in your orcdk.config.json'
      );
    }
    console.log('[localstack] LocalStack is already running');
  }
  
  private async checkDependencies(): Promise<void> {
    this.debug('Checking for LocalStack CLI');
    if (!(await this.cli!.hasLocalStackCLI())) {
      this.exitWithError(
        'LocalStack CLI not found. Please install it using: pip install localstack\n' +
        'For more information, visit: https://docs.localstack.cloud/getting-started/installation/'
      );
    }
    this.debug('LocalStack CLI found');
  }
  
  private async startLocalStack(): Promise<void> {
    console.log('[localstack] Starting LocalStack...');
    const env = this.getEnvironment();
    this.debug(`Environment variables: ${JSON.stringify(env)}`);
    await this.cli!.start(env);
    
    const config = this.config?.config as LocalStackConfig;
    const maxAttempts = config?.waitForReady?.maxAttempts ?? 30;
    const retryDelayMs = config?.waitForReady?.retryDelayMs ?? 2000;
    
    this.debug(`Waiting for LocalStack to be ready (maxAttempts: ${maxAttempts}, retryDelayMs: ${retryDelayMs})`);
    await this.cli!.waitForReady(this.getPort(), maxAttempts, retryDelayMs);
    console.log('[localstack] LocalStack is ready');
    
    // Start hot reloading if enabled
    await this.startHotReloading();
  }
  
  private getPort(): number {
    const listen = this.getEnvironment().GATEWAY_LISTEN || '127.0.0.1:4566';
    const port = parseInt(listen.split(':').pop() || '4566');
    
    // Validate port is within valid range
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`[localstack] Invalid port number: ${port}. Port must be between 1 and 65535.`);
    }
    
    return port;
  }
  
  private getEnvironment(): Record<string, string> {
    const config = this.config?.config as LocalStackConfig;
    return config?.environment || {};
  }

  /**
   * Start hot reloading functionality
   */
  private async startHotReloading(): Promise<void> {
    if (!this.hotReloadWatcher) {
      return;
    }

    const config = this.config?.config as LocalStackConfig;
    const lambdaPaths = config?.hotReloading?.lambdaPaths || [];

    if (lambdaPaths.length === 0) {
      this.debug('Hot reloading enabled but no Lambda paths configured');
      return;
    }

    this.debug('Setting up hot reload Lambda functions');
    
    // Get project root for path resolution
    const projectRoot = process.cwd();
    
    // Create hot reload enabled Lambda functions with resolved paths
    for (const lambdaPath of lambdaPaths) {
      try {
        // Expand environment variables in the path
        const expandedPath = expandEnvironmentVariables(lambdaPath.localPath);
        
        // Resolve path relative to project root if not absolute
        const resolvedPath = path.isAbsolute(expandedPath) 
          ? expandedPath 
          : path.resolve(projectRoot, expandedPath);
        
        // Expand environment variables in function name and handler
        const expandedFunctionName = expandEnvironmentVariables(lambdaPath.functionName);
        const expandedHandler = expandEnvironmentVariables(lambdaPath.handler);
        
        await this.cli!.createHotReloadFunction(
          expandedFunctionName,
          resolvedPath,
          expandedHandler,
          lambdaPath.runtime,
          this.getEnvironment()
        );
        this.debug(`Created hot reload function: ${expandedFunctionName} at ${resolvedPath}`);
      } catch (error) {
        // Non-fatal error - function might already exist
        this.debug(`Failed to create hot reload function ${lambdaPath.functionName}: ${error}`);
      }
    }

    // Start file watching
    await this.hotReloadWatcher.startWatching();
    console.log('[localstack] Hot reloading is active');
  }
  
  private exitWithError(message: string): never {
    throw new Error(`[localstack] ${message}`);
  }
  
  async cleanup(): Promise<void> {
    // Stop hot reloading first
    if (this.hotReloadWatcher) {
      this.hotReloadWatcher.stopWatching();
    }

    const config = this.config?.config as LocalStackConfig;
    if (config?.stopOnCleanup && this.cli) {
      console.log('[localstack] Stopping LocalStack...');
      await this.cli.stop();
    }
    
    // Unsubscribe from events
    if (this.eventBus) {
      this.eventBus.removeAllListeners(EventTypes['orchestrator:before:pattern-detection']);
    }
  }
  
  private debug(message: string): void {
    const config = this.config?.config as LocalStackConfig;
    if (config?.debug) {
      console.log(`[localstack:debug] ${message}`);
    }
  }

  /**
   * Get completion commands for bash completion
   */
  getCompletionCommands(): CommandInfo[] {
    return [{
      name: 'localstack',
      description: 'Manage LocalStack',
      arguments: [{
        name: 'action',
        required: true,
        choices: ['stop', 'restart', 'status', 'clean']
      }]
    }];
  }
}

// Export as default for easy importing
export default LocalStackPlugin;