# LocalStack Plugin API Reference

## Plugin Configuration

```typescript
interface LocalStackConfig {
  enabled: boolean;
  services?: string[];
  port?: number;
  autoStart?: boolean;
  persistence?: boolean;
  dockerFlags?: string[];
  startTimeout?: number;
}
```

## Lifecycle Hooks

### `beforeStackDeploy`
Starts LocalStack if autoStart is enabled and waits for services to be ready.

### `afterStackDestroy`
Stops LocalStack if it was started by the plugin.

### `onError`
Handles LocalStack startup/shutdown errors.

## Methods

### `initialize(config: PluginConfig, orcdkConfig: OrcdkConfig): Promise<void>`
Initializes the plugin with configuration.

### `start(): Promise<void>`
Starts LocalStack with the configured services.

### `stop(): Promise<void>`
Stops the LocalStack container.

### `waitForReady(): Promise<void>`
Waits for LocalStack services to be ready by checking health endpoint.

### `isRunning(): Promise<boolean>`
Checks if LocalStack is currently running.

## Events

The plugin emits the following events:
- `localstack:starting` - When LocalStack is starting
- `localstack:ready` - When all services are ready
- `localstack:stopping` - When LocalStack is stopping
- `localstack:error` - When an error occurs
