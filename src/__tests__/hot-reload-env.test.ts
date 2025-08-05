// Mock fs module first
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  watch: jest.fn(),
}));

import { HotReloadWatcher } from '../hot-reload';
import { LocalStackConfig } from '../types';
import * as fs from 'fs';
import { EventBus } from '@orcdkestrator/core';

// Mock EventBus
jest.mock('@orcdkestrator/core', () => {
  const mockEventBus = {
    emitEvent: jest.fn(),
  };
  return {
    EventBus: {
      getInstance: jest.fn(() => mockEventBus)
    }
  };
});

describe('HotReloadWatcher - Environment Variables', () => {
  let mockEventBus: any;
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Get mocked EventBus
    const mockedCore = jest.requireMock('@orcdkestrator/core');
    mockEventBus = mockedCore.EventBus.getInstance();
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });

  describe('environment variable expansion', () => {
    it('should expand environment variables in lambda paths', async () => {
      process.env.LAMBDA_BASE = './test/lambdas';
      process.env.FUNC_PREFIX = 'my-prefix';
      process.env.HANDLER_MODULE = 'main';
      
      const config: LocalStackConfig = {
        hotReloading: {
          enabled: true,
          lambdaPaths: [
            {
              functionName: '${FUNC_PREFIX}-function',
              localPath: '${LAMBDA_BASE}/function',
              handler: '${HANDLER_MODULE}.handler',
              runtime: 'python3.8'
            }
          ]
        }
      };

      const watcher = new HotReloadWatcher(config);
      
      // Mock fs methods
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      
      // Mock fs.watch
      const mockWatcher = { close: jest.fn() };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      await watcher.startWatching();

      // Verify fs.watch was called with expanded and resolved path
      expect(fs.watch).toHaveBeenCalledWith(
        expect.stringContaining('/test/lambdas/function'),
        expect.any(Object),
        expect.any(Function)
      );
      
      // The test is about verifying environment variable expansion in paths
      // We already tested that fs.watch was called with the expanded path
      // The event emission happens in file change callback which is tested elsewhere
      
      watcher.stopWatching();
    });

    it('should handle mixed relative paths and environment variables', async () => {
      process.env.ENV_NAME = 'development';
      process.env.SERVICE_NAME = 'user-service';
      
      const config: LocalStackConfig = {
        hotReloading: {
          enabled: true,
          lambdaPaths: [
            {
              functionName: '${SERVICE_NAME}-${ENV_NAME}',
              localPath: './lambdas/${ENV_NAME}/${SERVICE_NAME}',
              handler: 'index.handler',
              runtime: 'nodejs18.x'
            }
          ]
        }
      };

      const watcher = new HotReloadWatcher(config);
      
      // Mock fs methods
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      
      // Mock fs.watch
      const mockWatcher = { close: jest.fn() };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      await watcher.startWatching();

      // Verify fs.watch was called with fully resolved path
      expect(fs.watch).toHaveBeenCalledWith(
        expect.stringMatching(/.*\/lambdas\/development\/user-service$/),
        expect.any(Object),
        expect.any(Function)
      );
      
      watcher.stopWatching();
    });

    it('should handle undefined environment variables gracefully', async () => {
      // UNDEFINED_VAR is not set
      
      const config: LocalStackConfig = {
        hotReloading: {
          enabled: true,
          lambdaPaths: [
            {
              functionName: '${UNDEFINED_VAR}-function',
              localPath: './lambdas/${UNDEFINED_VAR}',
              handler: 'handler.main',
              runtime: 'python3.8'
            }
          ]
        }
      };

      const watcher = new HotReloadWatcher(config);
      
      // Mock fs methods - path won't exist with undefined var
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await watcher.startWatching();

      // Should not create watcher for non-existent path
      expect(fs.watch).not.toHaveBeenCalled();
      
      watcher.stopWatching();
    });
  });
});