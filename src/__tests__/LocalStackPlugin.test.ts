import { LocalStackPlugin } from '../index';
import { PluginConfig, OrcdkConfig } from '@orcdkestrator/core';

describe('LocalStackPlugin', () => {
  let plugin: LocalStackPlugin;
  let mockConfig: PluginConfig;
  let mockOrcdkConfig: OrcdkConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'localstack',
      enabled: true,
      config: {}
    };

    mockOrcdkConfig = {
      cdkRoot: 'cdk',
      deploymentStrategy: 'auto',
      environments: {
        local: { displayName: 'Local', isLocal: true }
      },
      plugins: []
    };

    plugin = new LocalStackPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('localstack');
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
