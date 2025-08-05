# Orcdkestrator Plugin: Localstack

LocalStack lifecycle management plugin for Orcdkestrator

## Installation

```bash
npm install @orcdkestrator/orcdk-plugin-localstack --save-dev
```

## Configuration

Add to your `orcdk.config.json`:

```json
{
  "plugins": [
    {
      "name": "localstack",
      "enabled": true,
      "config": {
        // Plugin-specific configuration
      }
    }
  ]
}
```

## Usage

See configuration section above and examples directory for detailed usage.

## API Reference

See [API Documentation](docs/api.md) for detailed information.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Enable/disable the plugin |

## Prerequisites

This plugin requires LocalStack CLI to be installed:

```bash
pip install localstack
```

## How It Works

The plugin manages LocalStack lifecycle including starting, stopping, health checks, and hot reloading for Lambda functions.

## Examples

See the [examples directory](docs/examples/) for complete examples.

## Development

```bash
# Clone the repository
git clone https://github.com/orcdkestrator/orcdk-plugin-localstack.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
