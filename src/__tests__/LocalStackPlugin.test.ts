import { LocalStackPlugin } from '../index';
import { LocalStackCLI } from '../cli';
import { HotReloadWatcher } from '../hot-reload';
import { PluginConfig, OrcdkConfig } from '@orcdkestrator/core';

// Mock the CLI module
jest.mock('../cli');

// Mock the HotReloadWatcher module
jest.mock('../hot-reload');

// Mock EventBus
jest.mock('@orcdkestrator/core', () => {
  const actual = jest.requireActual('@orcdkestrator/core');
  const mockEventBus = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    emitEvent: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: jest.fn().mockReturnValue([]),
    once: jest.fn()
  };
  return {
    ...actual,
    EventBus: {
      getInstance: jest.fn(() => mockEventBus)
    },
    EventTypes: {
      'orchestrator:before:pattern-detection': 'orchestrator:before:pattern-detection',
      'localstack:hot-reload:code-updated': 'localstack:hot-reload:code-updated'
    }
  };
});

describe('LocalStackPlugin', () => {
  let plugin: LocalStackPlugin;
  let mockCLI: jest.Mocked<LocalStackCLI>;
  let mockConsoleLog: jest.SpyInstance;
  let mockEventBus: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    // Create plugin instance
    plugin = new LocalStackPlugin();
    
    // Get mocked EventBus
    const mockedCore = jest.requireMock('@orcdkestrator/core');
    mockEventBus = mockedCore.EventBus.getInstance();
    
    // Create mock CLI
    mockCLI = {
      hasLocalStackCLI: jest.fn(),
      isHealthy: jest.fn(),
      start: jest.fn(),
      waitForReady: jest.fn(),
      stop: jest.fn(),
      status: jest.fn(),
      createHotReloadFunction: jest.fn(),
    } as any;
    
    // Inject mock CLI
    (plugin as any).cli = mockCLI;
  });
  
  afterEach(() => {
    mockConsoleLog.mockRestore();
  });
  
  describe('initialize', () => {
    it('should initialize with config and create CLI instance', async () => {
      const config: PluginConfig = { name: 'localstack', enabled: true };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {},
        plugins: [],
      };
      
      await plugin.initialize(config, orcdkConfig);
      
      expect((plugin as any).config).toBe(config);
      expect((plugin as any).orcdkConfig).toBe(orcdkConfig);
      expect((plugin as any).cli).toBeDefined();
    });
  });
  
  describe('shouldRun', () => {
    it('returns true for local environment with plugin enabled', () => {
      process.env.CDK_ENVIRONMENT = 'local';
      (plugin as any).config = { enabled: true };
      (plugin as any).orcdkConfig = {
        environments: { local: { displayName: 'Local', isLocal: true } }
      };
      
      expect((plugin as any).shouldRun()).toBe(true);
    });
    
    it('returns false when plugin disabled', () => {
      (plugin as any).config = { enabled: false };
      expect((plugin as any).shouldRun()).toBe(false);
    });
    
    it('returns false for non-local environment', () => {
      process.env.CDK_ENVIRONMENT = 'production';
      (plugin as any).config = { enabled: true };
      (plugin as any).orcdkConfig = {
        environments: { production: { displayName: 'Production', isLocal: false } }
      };
      
      expect((plugin as any).shouldRun()).toBe(false);
    });
    
    it('returns false when environment not configured', () => {
      process.env.CDK_ENVIRONMENT = 'unknown';
      (plugin as any).config = { enabled: true };
      (plugin as any).orcdkConfig = { environments: {} };
      
      expect((plugin as any).shouldRun()).toBe(false);
    });
  });
  
  describe('getPort', () => {
    it('extracts port from GATEWAY_LISTEN', () => {
      (plugin as any).config = {
        config: { environment: { GATEWAY_LISTEN: '0.0.0.0:3456' } }
      };
      
      expect((plugin as any).getPort()).toBe(3456);
    });
    
    it('defaults to 4566 when GATEWAY_LISTEN not set', () => {
      (plugin as any).config = { config: {} };
      expect((plugin as any).getPort()).toBe(4566);
    });
    
    it('defaults to 4566 when no config', () => {
      (plugin as any).config = {};
      expect((plugin as any).getPort()).toBe(4566);
    });
  });
  
  describe('getEnvironment', () => {
    it('returns environment variables from config', () => {
      const environment = { DEBUG: '1', PERSISTENCE: '1' };
      (plugin as any).config = { config: { environment } };
      
      expect((plugin as any).getEnvironment()).toEqual(environment);
    });
    
    it('returns empty object when no environment config', () => {
      (plugin as any).config = { config: {} };
      expect((plugin as any).getEnvironment()).toEqual({});
    });
  });
  
  describe('ensureNotRunning', () => {
    it('throws error if LocalStack already running', async () => {
      mockCLI.isHealthy.mockResolvedValue(true);
      (plugin as any).config = { config: {} };
      
      await expect((plugin as any).ensureNotRunning()).rejects.toThrow(
        '[localstack] LocalStack is already running on port 4566.\n' +
        'To stop the existing instance, run: localstack stop\n' +
        'Or configure a different port using GATEWAY_LISTEN environment variable.'
      );
      
      expect(mockCLI.isHealthy).toHaveBeenCalledWith(4566);
    });
    
    it('does not throw if LocalStack not running', async () => {
      mockCLI.isHealthy.mockResolvedValue(false);
      
      await (plugin as any).ensureNotRunning();
      
      expect(mockCLI.isHealthy).toHaveBeenCalled();
    });
  });
  
  describe('ensureRunning', () => {
    it('throws error if LocalStack not running when autoStart is false', async () => {
      mockCLI.isHealthy.mockResolvedValue(false);
      (plugin as any).config = { config: {} };
      
      await expect((plugin as any).ensureRunning()).rejects.toThrow(
        '[localstack] LocalStack is not running on port 4566.\n' +
        'Since autoStart is disabled, you need to start LocalStack manually:\n' +
        '  localstack start\n' +
        'Or enable autoStart in your orcdk.config.json'
      );
      
      expect(mockCLI.isHealthy).toHaveBeenCalledWith(4566);
    });
    
    it('logs message if LocalStack is running', async () => {
      mockCLI.isHealthy.mockResolvedValue(true);
      (plugin as any).config = { config: {} };
      
      await (plugin as any).ensureRunning();
      
      expect(mockCLI.isHealthy).toHaveBeenCalledWith(4566);
      expect(mockConsoleLog).toHaveBeenCalledWith('[localstack] LocalStack is already running');
    });
  });
  
  describe('checkDependencies', () => {
    it('throws error if localstack CLI not found', async () => {
      mockCLI.hasLocalStackCLI.mockResolvedValue(false);
      
      await expect((plugin as any).checkDependencies()).rejects.toThrow(
        '[localstack] LocalStack CLI not found. Please install it using: pip install localstack\n' +
        'For more information, visit: https://docs.localstack.cloud/getting-started/installation/'
      );
    });
    
    it('does not throw if localstack CLI found', async () => {
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      
      await (plugin as any).checkDependencies();
      
      expect(mockCLI.hasLocalStackCLI).toHaveBeenCalled();
    });
  });
  
  describe('pattern detection event handling', () => {
    beforeEach(async () => {
      process.env.CDK_ENVIRONMENT = 'local';
      // Initialize the plugin to register event handlers
      const config: PluginConfig = { name: 'localstack', enabled: true, config: {} };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {
          local: { displayName: 'Local', isLocal: true }
        },
        plugins: [],
      };
      await plugin.initialize(config, orcdkConfig);
      
      // Re-inject mock CLI after initialization
      (plugin as any).cli = mockCLI;
    });
    
    it('should start LocalStack when all conditions met', async () => {
      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await eventHandler();
      
      expect(mockCLI.hasLocalStackCLI).toHaveBeenCalled();
      expect(mockCLI.start).toHaveBeenCalledWith({});
      expect(mockCLI.waitForReady).toHaveBeenCalledWith(4566, 30, 2000);
    });
    
    it('should not run when shouldRun returns false', async () => {
      (plugin as any).config = { enabled: false };
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await eventHandler();
      
      expect(mockCLI.isHealthy).not.toHaveBeenCalled();
    });
    
    it('should throw error if LocalStack already running', async () => {
      mockCLI.isHealthy.mockResolvedValue(true);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await expect(eventHandler()).rejects.toThrow(
        '[localstack] LocalStack is already running on port 4566.\n' +
        'To stop the existing instance, run: localstack stop\n' +
        'Or configure a different port using GATEWAY_LISTEN environment variable.'
      );
      
      expect(mockCLI.start).not.toHaveBeenCalled();
    });
    
    it('should pass environment variables to CLI start', async () => {
      const environment = { DEBUG: '1', PERSISTENCE: '1' };
      (plugin as any).config = { enabled: true, config: { environment } };
      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await eventHandler();
      
      expect(mockCLI.start).toHaveBeenCalledWith(environment);
      expect(mockCLI.waitForReady).toHaveBeenCalledWith(4566, 30, 2000);
    });
    
    it('should check if LocalStack is running when autoStart is false', async () => {
      (plugin as any).config = { enabled: true, config: { autoStart: false } };
      mockCLI.isHealthy.mockResolvedValue(true);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await eventHandler();
      
      expect(mockCLI.isHealthy).toHaveBeenCalledWith(4566);
      expect(mockCLI.hasLocalStackCLI).not.toHaveBeenCalled();
      expect(mockCLI.start).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('[localstack] LocalStack is already running');
    });
    
    it('should throw error if LocalStack not running when autoStart is false', async () => {
      (plugin as any).config = { enabled: true, config: { autoStart: false } };
      mockCLI.isHealthy.mockResolvedValue(false);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await expect(eventHandler()).rejects.toThrow(
        '[localstack] LocalStack is not running on port 4566.\n' +
        'Since autoStart is disabled, you need to start LocalStack manually:\n' +
        '  localstack start\n' +
        'Or enable autoStart in your orcdk.config.json'
      );
      
      expect(mockCLI.hasLocalStackCLI).not.toHaveBeenCalled();
      expect(mockCLI.start).not.toHaveBeenCalled();
    });
    
    it('should default autoStart to true when not specified', async () => {
      (plugin as any).config = { enabled: true, config: {} };
      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      
      // Get the event handler from the mock
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];
      
      await eventHandler();
      
      // Should proceed with starting LocalStack
      expect(mockCLI.hasLocalStackCLI).toHaveBeenCalled();
      expect(mockCLI.start).toHaveBeenCalled();
      expect(mockCLI.waitForReady).toHaveBeenCalled();
    });
  });

  describe('hot reloading', () => {
    let mockHotReloadWatcher: jest.Mocked<HotReloadWatcher>;

    beforeEach(() => {
      mockHotReloadWatcher = {
        startWatching: jest.fn(),
        stopWatching: jest.fn(),
      } as any;

      // Mock the HotReloadWatcher constructor
      (HotReloadWatcher as jest.MockedClass<typeof HotReloadWatcher>).mockImplementation(() => mockHotReloadWatcher);
    });

    it('should initialize hot reload watcher when enabled', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true,
            lambdaPaths: []
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {},
        plugins: [],
      };

      await plugin.initialize(config, orcdkConfig);

      expect(HotReloadWatcher).toHaveBeenCalledWith(config.config);
      expect((plugin as any).hotReloadWatcher).toBe(mockHotReloadWatcher);
    });

    it('should not initialize hot reload watcher when disabled', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: false
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {},
        plugins: [],
      };

      await plugin.initialize(config, orcdkConfig);

      expect(HotReloadWatcher).not.toHaveBeenCalled();
      expect((plugin as any).hotReloadWatcher).toBeNull();
    });

    it('should start hot reloading after LocalStack is ready', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true,
            lambdaPaths: [
              {
                functionName: 'test-function',
                localPath: '/absolute/test/path',
                handler: 'handler.function',
                runtime: 'python3.8'
              }
            ]
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {
          local: { displayName: 'Local', isLocal: true }
        },
        plugins: [],
      };

      process.env.CDK_ENVIRONMENT = 'local';
      await plugin.initialize(config, orcdkConfig);
      (plugin as any).cli = mockCLI;

      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);

      // Get the event handler and call it
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];

      await eventHandler();

      expect(mockCLI.createHotReloadFunction).toHaveBeenCalledWith(
        'test-function',
        '/absolute/test/path',
        'handler.function',
        'python3.8',
        {}
      );
      expect(mockHotReloadWatcher.startWatching).toHaveBeenCalled();
    });

    it('should expand environment variables in hot reload configuration', async () => {
      // Set up environment variables
      process.env.LAMBDA_BASE_PATH = './lambdas';
      process.env.FUNCTION_PREFIX = 'test';
      process.env.HANDLER_MODULE = 'handler';
      
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true,
            lambdaPaths: [
              {
                functionName: '${FUNCTION_PREFIX}-function',
                localPath: '${LAMBDA_BASE_PATH}/test-function',
                handler: '${HANDLER_MODULE}.function',
                runtime: 'python3.8'
              }
            ]
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {
          local: { displayName: 'Local', isLocal: true }
        },
        plugins: [],
      };

      process.env.CDK_ENVIRONMENT = 'local';
      await plugin.initialize(config, orcdkConfig);
      (plugin as any).cli = mockCLI;

      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);

      // Get the event handler and call it
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];

      await eventHandler();

      // Should expand environment variables and resolve to absolute path
      expect(mockCLI.createHotReloadFunction).toHaveBeenCalledWith(
        'test-function',  // Expanded from ${FUNCTION_PREFIX}-function
        expect.stringContaining('/lambdas/test-function'),  // Expanded and resolved
        'handler.function',  // Expanded from ${HANDLER_MODULE}.function
        'python3.8',
        {}
      );
      
      // Clean up
      delete process.env.LAMBDA_BASE_PATH;
      delete process.env.FUNCTION_PREFIX;
      delete process.env.HANDLER_MODULE;
    });

    it('should resolve relative paths to absolute paths for hot reloading', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true,
            lambdaPaths: [
              {
                functionName: 'test-function',
                localPath: './lambdas/test-function',  // Relative path
                handler: 'handler.function',
                runtime: 'python3.8'
              }
            ]
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {
          local: { displayName: 'Local', isLocal: true }
        },
        plugins: [],
      };

      process.env.CDK_ENVIRONMENT = 'local';
      await plugin.initialize(config, orcdkConfig);
      (plugin as any).cli = mockCLI;

      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);

      // Get the event handler and call it
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];

      await eventHandler();

      // Should resolve to absolute path
      expect(mockCLI.createHotReloadFunction).toHaveBeenCalledWith(
        'test-function',
        expect.stringContaining('/lambdas/test-function'),  // Should be absolute
        'handler.function',
        'python3.8',
        {}
      );
      
      // Verify it's an absolute path
      const callArgs = mockCLI.createHotReloadFunction.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs![1]).toMatch(/^\/.*\/lambdas\/test-function$/);
    });

    it('should handle createHotReloadFunction errors gracefully', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true,
            lambdaPaths: [
              {
                functionName: 'test-function',
                localPath: '/test/path',
                handler: 'handler.function',
                runtime: 'python3.8'
              }
            ]
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {
          local: { displayName: 'Local', isLocal: true }
        },
        plugins: [],
      };

      process.env.CDK_ENVIRONMENT = 'local';
      await plugin.initialize(config, orcdkConfig);
      (plugin as any).cli = mockCLI;

      mockCLI.isHealthy.mockResolvedValue(false);
      mockCLI.hasLocalStackCLI.mockResolvedValue(true);
      mockCLI.createHotReloadFunction.mockRejectedValue(new Error('Function already exists'));

      // Get the event handler and call it
      const mockedCore = jest.requireMock('@orcdkestrator/core');
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === mockedCore.EventTypes['orchestrator:before:pattern-detection']
      )?.[1];

      // Should not throw error
      await expect(eventHandler()).resolves.toBeUndefined();

      expect(mockHotReloadWatcher.startWatching).toHaveBeenCalled();
    });

    it('should stop hot reload watcher during cleanup', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {
          hotReloading: {
            enabled: true
          }
        }
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {},
        plugins: [],
      };

      await plugin.initialize(config, orcdkConfig);
      (plugin as any).hotReloadWatcher = mockHotReloadWatcher;

      await plugin.cleanup();

      expect(mockHotReloadWatcher.stopWatching).toHaveBeenCalled();
    });

    it('should handle cleanup when no hot reload watcher exists', async () => {
      const config: PluginConfig = {
        name: 'localstack',
        enabled: true,
        config: {}
      };
      const orcdkConfig: OrcdkConfig = {
        cdkRoot: 'cdk',
        deploymentStrategy: 'auto',
        environments: {},
        plugins: [],
      };

      await plugin.initialize(config, orcdkConfig);

      // Should not throw error
      await expect(plugin.cleanup()).resolves.toBeUndefined();
    });
  });
});