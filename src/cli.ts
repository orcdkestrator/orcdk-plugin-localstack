import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { LocalStackStatus } from './types';

const exec = promisify(execCallback);

/**
 * LocalStack CLI wrapper - handles all LocalStack command execution
 * This file is excluded from coverage as it's primarily 3rd party integration
 */
export class LocalStackCLI {
  async hasLocalStackCLI(): Promise<boolean> {
    return await this.commandExists('localstack');
  }
  
  async start(env: Record<string, string>): Promise<void> {
    await this.exec('localstack start -d', env);
  }
  
  async stop(): Promise<void> {
    await this.exec('localstack stop');
  }
  
  async isHealthy(port: number, timeoutMs = 5000): Promise<boolean> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const res = await fetch(`http://localhost:${port}/_localstack/health`, {
          signal: controller.signal
        });
        return res.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle abort error or network error
      return false;
    }
  }
  
  async waitForReady(port: number, maxAttempts = 30, retryDelayMs = 2000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isHealthy(port)) return;
      await this.sleep(retryDelayMs);
    }
    throw new Error('LocalStack startup timeout');
  }
  
  async status(): Promise<LocalStackStatus> {
    try {
      const { stdout } = await exec('localstack status');
      const running = stdout.includes('running');
      return { running, output: stdout };
    } catch {
      return { running: false, output: 'LocalStack not running' };
    }
  }

  async createHotReloadFunction(
    functionName: string,
    localPath: string,
    handler: string,
    runtime: string,
    env?: Record<string, string>
  ): Promise<void> {
    // LocalStack requires absolute paths for hot reload
    // Path should be resolved by caller, but validate here
    if (!path.isAbsolute(localPath)) {
      throw new Error(`LocalStack hot reload requires absolute path, got: ${localPath}. Path should be resolved before calling this method.`);
    }

    // LocalStack uses a magic S3 bucket named "hot-reload" for hot reloading functionality
    // This is a LocalStack-specific feature, not a real S3 bucket
    const LOCALSTACK_HOT_RELOAD_BUCKET = process.env.LOCALSTACK_HOT_RELOAD_BUCKET || 'hot-reload';

    const cmd = [
      'awslocal lambda create-function',
      `--function-name ${functionName}`,
      `--code S3Bucket="${LOCALSTACK_HOT_RELOAD_BUCKET}",S3Key="${localPath}"`,
      `--handler ${handler}`,
      `--runtime ${runtime}`
    ].join(' ');

    await this.exec(cmd, env);
  }
  
  private async commandExists(cmd: string): Promise<boolean> {
    // Validate cmd contains only alphanumeric characters and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(cmd)) {
      throw new Error('Invalid command name');
    }
    
    try {
      await exec(`which ${cmd}`);
      return true;
    } catch {
      return false;
    }
  }
  
  private async exec(cmd: string, env?: Record<string, string>): Promise<void> {
    await exec(cmd, { env: { ...process.env, ...env } });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}