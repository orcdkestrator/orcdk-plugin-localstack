# LocalStack Plugin Examples

## Basic Configuration

```json
{
  "environments": {
    "local": {
      "isLocal": true,
      "plugins": {
        "@orcdkestrator/localstack": {
          "enabled": true,
          "config": {
            "autoStart": true
          }
        }
      }
    }
  }
}
```

## With Specific Services

```json
{
  "environments": {
    "local": {
      "isLocal": true,
      "plugins": {
        "@orcdkestrator/localstack": {
          "enabled": true,
          "config": {
            "services": ["s3", "dynamodb", "lambda", "sqs"],
            "port": 4566,
            "autoStart": true,
            "persistence": true
          }
        }
      }
    }
  }
}
```

## With Docker Configuration

```json
{
  "environments": {
    "local": {
      "isLocal": true,
      "plugins": {
        "@orcdkestrator/localstack": {
          "enabled": true,
          "config": {
            "services": ["s3", "dynamodb"],
            "autoStart": true,
            "dockerFlags": [
              "-v", "/tmp/localstack:/tmp/localstack",
              "-v", "/var/run/docker.sock:/var/run/docker.sock"
            ],
            "startTimeout": 60
          }
        }
      }
    }
  }
}
```

## Usage

```bash
# LocalStack will auto-start before deployment
orcdk deploy --env local

# Check LocalStack status
docker ps | grep localstack

# View LocalStack logs
docker logs localstack_main
```
