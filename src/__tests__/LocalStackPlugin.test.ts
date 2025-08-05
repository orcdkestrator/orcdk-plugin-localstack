import { LocalstackPlugin } from '../index';
import { PluginConfig, OrcdkConfig } from '@orcdkestrator/core';

describe('LocalstackPlugin', () => {
  let plugin: LocalstackPlugin;
  let mockConfig: PluginConfig;
  let mockOrcdkConfig: OrcdkConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'localstack',
      enabled: true,
      options: {}
    };

    mockOrcdkConfig = {
      version: '1.0.0',
      environments: {},
      isLocal: true,
      plugins: []
    };

    plugin = new LocalstackPlugin();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('localstack');
  });

  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
