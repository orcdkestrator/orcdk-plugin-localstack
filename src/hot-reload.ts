import * as fs from 'fs';
import * as path from 'path';
import { EventBus } from '@orcdkestrator/core';
import { LocalStackConfig } from './types';
import { expandEnvironmentVariables } from './utils';
import { getFileExtensionsForRuntime } from './runtime-config';

// Default debounce interval for file change detection (milliseconds)
export const DEFAULT_WATCH_INTERVAL_MS = 700;

/**
 * Hot reload file watcher for LocalStack Lambda functions
 * Monitors file changes and triggers LocalStack hot reload via events
 */
export class HotReloadWatcher {
  private config: LocalStackConfig;
  private eventBus: EventBus;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private lastModified: Map<string, number> = new Map();
  private isWatching = false;

  constructor(config: LocalStackConfig) {
    this.config = config;
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Start watching configured Lambda paths for changes
   */
  async startWatching(): Promise<void> {
    if (!this.config.hotReloading?.enabled || this.isWatching) {
      return;
    }

    const lambdaPaths = this.config.hotReloading.lambdaPaths || [];
    
    if (lambdaPaths.length === 0) {
      this.debug('No Lambda paths configured for hot reloading');
      return;
    }

    this.debug(`Starting hot reload watching for ${lambdaPaths.length} Lambda functions`);
    
    // Get project root for path resolution
    const projectRoot = process.cwd();
    
    for (const lambdaPath of lambdaPaths) {
      // Expand environment variables first
      const expandedPath = expandEnvironmentVariables(lambdaPath.localPath);
      
      // Get file extensions for this runtime
      const fileExtensions = lambdaPath.fileExtensions || 
        getFileExtensionsForRuntime(
          lambdaPath.runtime, 
          this.config.hotReloading?.runtimeFileExtensions
        );
      
      // Resolve relative paths before watching
      const resolvedConfig = {
        ...lambdaPath,
        localPath: path.isAbsolute(expandedPath)
          ? expandedPath
          : path.resolve(projectRoot, expandedPath),
        functionName: expandEnvironmentVariables(lambdaPath.functionName),
        handler: expandEnvironmentVariables(lambdaPath.handler),
        fileExtensions
      };
      await this.watchLambdaPath(resolvedConfig);
    }

    this.isWatching = true;
    this.debug('Hot reload watching started');
  }

  /**
   * Stop watching all Lambda paths
   */
  stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    this.debug('Stopping hot reload watching');
    
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      this.debug(`Stopped watching ${path}`);
    }
    
    this.watchers.clear();
    this.lastModified.clear();
    this.isWatching = false;
    this.debug('Hot reload watching stopped');
  }

  /**
   * Watch a specific Lambda path for changes
   */
  private async watchLambdaPath(lambdaConfig: {
    functionName: string;
    localPath: string;
    handler: string;
    runtime: string;
    fileExtensions: string[];
  }): Promise<void> {
    const { functionName, localPath, handler, runtime, fileExtensions } = lambdaConfig;
    
    if (!fs.existsSync(localPath)) {
      this.debug(`Lambda path does not exist: ${localPath}`);
      return;
    }

    const stat = fs.statSync(localPath);
    if (!stat.isDirectory()) {
      this.debug(`Lambda path is not a directory: ${localPath}`);
      return;
    }

    this.debug(`Setting up hot reload for ${functionName} at ${localPath}`);
    this.debug(`Watching file extensions: ${fileExtensions.join(', ')}`);

    // Initialize last modified time
    this.lastModified.set(localPath, Date.now());

    // Create file watcher
    const watcher = fs.watch(localPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = path.join(localPath, filename);
      const ext = path.extname(filename).toLowerCase();
      
      // Filter for relevant file types based on configured extensions
      if (!fileExtensions.includes(ext)) {
        return;
      }

      this.handleFileChange(functionName, localPath, fullPath, handler, runtime);
    });

    this.watchers.set(localPath, watcher);
    this.debug(`Started watching ${localPath} for ${functionName}`);
  }

  /**
   * Handle file change event with debouncing
   */
  private handleFileChange(
    functionName: string, 
    localPath: string, 
    changedFile: string, 
    handler: string, 
    runtime: string
  ): void {
    const now = Date.now();
    const lastMod = this.lastModified.get(localPath) || 0;
    const interval = this.config.hotReloading?.watchInterval || DEFAULT_WATCH_INTERVAL_MS;

    // Debounce rapid file changes
    if (now - lastMod < interval) {
      return;
    }

    this.lastModified.set(localPath, now);
    
    this.debug(`File change detected: ${changedFile}`);
    
    // Emit event for hot reload
    this.eventBus.emitEvent(
      'localstack:hot-reload:code-updated',
      {
        functionName,
        localPath,
        changedFile,
        handler,
        runtime,
        timestamp: new Date(),
      },
      'LocalStackHotReload'
    );

    console.log(`[localstack:hot-reload] Code updated for ${functionName}: ${path.basename(changedFile)}`);
  }


  /**
   * Debug logging helper
   */
  private debug(message: string): void {
    if (this.config.debug) {
      console.log(`[localstack:hot-reload:debug] ${message}`);
    }
  }
}